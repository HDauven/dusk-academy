// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// Trusted, fixed scenarios. Learners supply WASM, never native tests or commands.
use dusk_core::abi::ContractId;
use dusk_vm::{ContractData, Error, Session, VM};
use std::io::Write;
#[path = "support/advanced.rs"]
mod advanced;

const ID: ContractId = ContractId::from_bytes([1; 32]);
const GAS: u64 = 5_000_000;

fn number(session: &mut Session, method: &str) -> Result<u64, String> {
    let get = |session: &mut Session| {
        session.call::<_, u64>(ID, method, &(), GAS)
            .map(|receipt| receipt.data)
            .map_err(|error| format!("{method} could not finish: {error}"))
    };
    let value = get(session)?;
    if get(session)? != value {
        return Err(format!("{method} changed the state. A read should leave it alone."));
    }
    Ok(value)
}

fn read(session: &mut Session) -> Result<u64, String> {
    number(session, "get_count")
}

fn deploy(session: &mut Session, bytes: &[u8]) -> Result<(), String> {
    session.deploy(bytes, ContractData::builder().owner([0; 32]).contract_id(ID), GAS)
        .map(|_| ()).map_err(|error| format!("Deployment failed: {error}"))
}

fn call(session: &mut Session, amount: u64, fresh: bool) -> Result<String, String> {
    let before = read(session)?;
    let status = match session.call::<_, ()>(ID, "register", &amount, GAS) {
        Ok(_) => "accepted",
        Err(Error::Panic(_)) => "rejected",
        // Exhausted gas, invalid ABI and missing entrypoints are not valid guards.
        Err(error) => return Err(format!("register({amount}) could not finish: {error}")),
    };
    let after = read(session)?;
    // All labels are fixed or numeric; no learner-controlled strings enter JSON.
    let label = if amount == u64::MAX { "register(u64::MAX)".into() } else { format!("register({amount})") };
    Ok(format!("{{\"call\":\"{label}\",\"status\":\"{status}\",\"before\":\"{before}\",\"after\":\"{after}\",\"fresh\":{fresh}}}"))
}

fn record_call(session: &mut Session, mode: &str, method: &str, arg: u64, fresh: bool) -> Result<String, String> {
    let before = read(session)?;
    let result = match method {
        "registration_count" | "next_id" => session.call::<_, u64>(ID, method, &(), GAS).map(|r| r.data.to_string()),
        "register" => session.call::<_, u64>(ID, method, &arg, GAS).map(|r| r.data.to_string()),
        "cancel" => session.call::<_, ()>(ID, method, &arg, GAS).map(|_| "()".into()),
        "get_registration" if mode == "records-read" => session.call::<_, u64>(ID, method, &arg, GAS).map(|r| r.data.to_string()),
        "get_registration" => session.call::<_, Option<u64>>(ID, method, &arg, GAS)
            .map(|r| r.data.map_or("None".into(), |n| format!("Some({n})"))),
        _ => return Err("Unknown record operation.".into()),
    };
    let (status, value) = match result {
        Ok(value) => ("accepted", format!("\"{value}\"")),
        Err(Error::Panic(_)) => ("rejected", "null".into()),
        Err(error) => return Err(format!("{method} could not finish: {error}")),
    };
    let after = read(session)?;
    let size = number(session, "registration_count")?;
    let next = if mode == "records-empty" { "null".into() } else { format!("\"{}\"", number(session, "next_id")?) };
    let argument = if ["registration_count", "next_id"].contains(&method) { String::new() }
        else if arg == u64::MAX { "u64::MAX".into() } else { arg.to_string() };
    // Only fixed method names and typed VM values enter this JSON.
    Ok(format!("{{\"call\":\"{method}({argument})\",\"status\":\"{status}\",\"before\":\"{before}\",\"after\":\"{after}\",\"fresh\":{fresh},\"value\":{value},\"size\":\"{size}\",\"next\":{next}}}"))
}

fn record_calls(session: &mut Session, fresh: &mut Session, mode: &str) -> Result<Vec<String>, String> {
    if mode == "records-empty" {
        return Ok(vec![record_call(session, mode, "registration_count", 0, false)?,
            record_call(fresh, mode, "registration_count", 0, true)?]);
    }
    let mut calls = vec![record_call(session, mode, "next_id", 0, false)?];
    for amount in [2, 0, 3, 6, 5, u64::MAX] {
        calls.push(record_call(session, mode, "register", amount, false)?);
    }
    if ["records-read", "records-missing", "records-cancel"].contains(&mode) {
        for id in 0..3 {
            calls.push(record_call(session, mode, "get_registration", id, false)?);
        }
    }
    if ["records-missing", "records-cancel"].contains(&mode) {
        for id in [4_294_967_296, u64::MAX] {
            calls.push(record_call(session, mode, "get_registration", id, false)?);
        }
    }
    if mode == "records-cancel" {
        for (method, arg) in [("cancel", 1), ("get_registration", 2), ("get_registration", 1),
            ("cancel", 1), ("register", 3), ("cancel", u64::MAX), ("cancel", 0),
            ("get_registration", 3), ("cancel", 2), ("cancel", 3), ("register", 10), ("get_registration", 4)] {
            calls.push(record_call(session, mode, method, arg, false)?);
        }
        calls.push(record_call(fresh, mode, "register", 8, true)?);
        calls.push(record_call(fresh, mode, "get_registration", 0, false)?);
    } else {
        let method = if mode == "records-missing" { "get_registration" } else { "next_id" };
        calls.push(record_call(fresh, mode, method, 0, true)?);
    }
    Ok(calls)
}

fn run() -> Result<(), String> {
    let mode = std::env::args().nth(1).unwrap_or_else(|| "state".into());
    if !["state", "arguments", "validation", "capacity", "read2", "read7", "explorer", "records-empty",
        "records-ids", "records-save", "records-read", "records-missing", "records-cancel"].contains(&mode.as_str()) && !advanced::MODES.contains(&mode.as_str()) {
        return Err("Unknown lesson scenario.".into());
    }
    let bytes = std::fs::read("/work/lesson.wasm").map_err(|e| e.to_string())?;
    if bytes.len() > 1_048_576 { return Err("The compiled contract is too large.".into()); }
    let vm = VM::ephemeral().map_err(|e| e.to_string())?;
    let mut session = vm.genesis_session(1);
    deploy(&mut session, &bytes)?;
    if mode == "explorer" {
        let method = std::env::args().nth(2).unwrap_or_default();
        if !["get_registration", "owner_of", "is_confirmed"].contains(&method.as_str()) {
            return Err("Unknown registry getter.".into());
        }
        let args = std::fs::read("/work/args").map_err(|e| e.to_string())?;
        if args.len() != 8 { return Err("Supply one encoded u64 record ID.".into()); }
        let receipt = session.call_raw(ID, &method, args, GAS).map_err(|e| e.to_string())?;
        std::io::stdout().write_all(&receipt.data).map_err(|e| e.to_string())?;
        return Ok(());
    }
    let initial = read(&mut session)?;
    if mode == "read2" || mode == "read7" {
        let amount = if mode == "read2" { 2u64 } else { 7u64 };
        session.call::<_, ()>(ID, "register", &amount, GAS).map_err(|e| e.to_string())?;
        let receipt = session.call_raw(ID, "get_count", Vec::new(), GAS).map_err(|e| e.to_string())?;
        std::io::stdout().write_all(&receipt.data).map_err(|e| e.to_string())?;
        return Ok(());
    }
    let fresh_vm = VM::ephemeral().map_err(|e| e.to_string())?;
    let mut fresh = fresh_vm.genesis_session(1);
    deploy(&mut fresh, &bytes)?;
    let reset = read(&mut fresh)?;
    // Decimal strings preserve the complete u64 range across JSON/JavaScript.
    if mode == "state" {
        let mut counts = Vec::new();
        for _ in 0..3 {
            session.call::<_, ()>(ID, "register", &(), GAS)
                .map_err(|e| format!("register could not finish: {e}"))?;
            counts.push(read(&mut session)?);
        }
        println!("{{\"initial\":\"{initial}\",\"after\":[\"{}\",\"{}\",\"{}\"],\"fresh\":\"{reset}\"}}", counts[0], counts[1], counts[2]);
    } else if advanced::MODES.contains(&mode.as_str()) {
        let calls = advanced::calls(&mut session, &mode)?;
        println!("{}", serde_json::json!({"initial":initial.to_string(),"fresh":reset.to_string(),"scenario":mode,"advanced":true,"calls":calls}));
    } else if mode.starts_with("records-") {
        let calls = record_calls(&mut session, &mut fresh, &mode)?;
        println!("{{\"initial\":\"{initial}\",\"fresh\":\"{reset}\",\"scenario\":\"{mode}\",\"calls\":[{}]}}", calls.join(","));
    } else {
        let amounts: &[u64] = match mode.as_str() {
            "arguments" => &[2, 3, 1],
            "validation" => &[2, 3, 1, 0, 1],
            "capacity" => &[3, 8, 7, 1, 0, u64::MAX],
            _ => unreachable!(),
        };
        let mut calls = Vec::new();
        for &amount in amounts {
            calls.push(call(&mut session, amount, false)?);
        }
        if mode == "capacity" {
            // Eight is valid in an empty register; validate the total, not the input alone.
            calls.push(call(&mut fresh, 8, true)?);
            calls.push(call(&mut fresh, 2, false)?);
        }
        println!("{{\"initial\":\"{initial}\",\"fresh\":\"{reset}\",\"scenario\":\"{mode}\",\"calls\":[{}]}}", calls.join(","));
    }
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
