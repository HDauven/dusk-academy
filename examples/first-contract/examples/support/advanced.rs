// Fixed local teaching scenarios. No learner-supplied call plans or native code.
use dusk_core::abi::{ContractError, ContractId, Event};
use dusk_core::transfer::TRANSFER_CONTRACT;
use dusk_vm::{ContractData, Error, Session};
use serde_json::{json, Value};
use super::{ID, GAS, number, read};

pub const MODES: &[&str] = &["permissions-caller", "permissions-owner", "permissions-cancel",
    "permissions-resize", "events-register", "events-changes", "calls-quote", "calls-confirm",
    "tests-invariant", "tests-atomic", "build-driver"];
const A: ContractId = ContractId::from_bytes([0x22; 32]);
const B: ContractId = ContractId::from_bytes([0x33; 32]);
const VENUE: ContractId = ContractId::from_bytes([0x44; 32]);

fn hex(bytes: &[u8]) -> String { bytes.iter().map(|b| format!("{b:02x}")).collect() }

fn events(events: Vec<Event>) -> Result<Value, String> {
    if events.len() > 16 { return Err("Too many events for this exercise.".into()); }
    events.into_iter().map(|e| {
        if e.topic.len() > 64 || e.data.len() > 256 { return Err("An event exceeds the lesson limit.".into()); }
        Ok(json!({"source":hex(e.source.as_bytes()), "topic":e.topic, "data":e.data}))
    }).collect::<Result<Vec<_>, _>>().map(Value::Array)
}

fn snapshot(session: &mut Session, phase: usize) -> Result<Value, String> {
    let mut records = Vec::new();
    if phase >= 1 {
        for id in [0u64,1,2,3,4,5,6,7,4_294_967_296,u64::MAX] {
            let seats = session.call::<_, Option<u64>>(ID,"get_registration",&id,GAS).map_err(|e| e.to_string())?.data;
            let owner = session.call::<_, Option<ContractId>>(ID,"owner_of",&id,GAS).map_err(|e| e.to_string())?.data;
            let confirmed = if phase >= 7 {
                session.call::<_, Option<bool>>(ID,"is_confirmed",&id,GAS).map_err(|e| e.to_string())?.data
            } else { None };
            records.push(json!({"id":id.to_string(), "seats":seats.map(|n| n.to_string()),
                "owner":owner.map(|id| hex(id.as_bytes())), "confirmed":confirmed}));
        }
    }
    let accounted = if phase >= 8 { Some(number(session,"accounted_seats")?.to_string()) } else { None };
    let booked = session.call::<_,u64>(VENUE,"booked",&(),GAS).map_err(|e| e.to_string())?.data;
    Ok(json!({"records":records,"accounted":accounted,"booked":booked.to_string()}))
}

struct Trace<'a> { session: &'a mut Session, phase: usize, rows: Vec<Value> }

impl Trace<'_> {
    fn push(&mut self, actor: &str, call: String, before: u64, result: Result<String, ContractError>, emitted: Vec<Event>) -> Result<(), String> {
        let (status, value) = match result {
            Ok(value) => ("accepted", Some(value)),
            Err(ContractError::Panic(_)) => ("rejected", None),
            Err(error) => return Err(format!("{actor}: {call} could not finish: {error}")),
        };
        let after = read(self.session)?;
        let mut row = snapshot(self.session, self.phase)?;
        row["actor"] = json!(actor); row["call"] = json!(call); row["status"] = json!(status);
        row["before"] = json!(before.to_string()); row["after"] = json!(after.to_string());
        row["value"] = json!(value); row["size"] = json!(number(self.session,"registration_count")?.to_string());
        row["next"] = json!(number(self.session,"next_id")?.to_string()); row["fresh"] = json!(false);
        // Preserve raw local receipt events, including events from failed child work.
        // They are not a statement about committed transaction success or finality.
        row["events"] = events(emitted)?;
        self.rows.push(row);
        Ok(())
    }

    fn actor_id(actor: &str) -> Option<ContractId> {
        match actor { "A" => Some(A), "B" => Some(B), "Transfer" => Some(TRANSFER_CONTRACT), _ => None }
    }

    fn current(&mut self, actor: &str) -> Result<(), String> {
        let before = read(self.session)?;
        let receipt = if let Some(actor) = Self::actor_id(actor) {
            let r = self.session.call::<_,Result<Option<ContractId>,ContractError>>(actor,"current",&(),GAS).map_err(|e| e.to_string())?;
            (r.data, r.events)
        } else {
            let r = self.session.call::<_,Option<ContractId>>(ID,"current_caller",&(),GAS).map_err(|e| e.to_string())?;
            (Ok(r.data), r.events)
        };
        self.push(actor,"current_caller()".into(),before,receipt.0.map(|id| id.map_or("None".into(),|id| hex(id.as_bytes()))),receipt.1)
    }

    fn action(&mut self, actor: &str, action: u8, a: u64, b: u64) -> Result<(), String> {
        let method = ["register","cancel","resize","confirm","confirm_pair"][action as usize];
        let arg = if a == u64::MAX { "u64::MAX".into() } else { a.to_string() };
        let label = if action == 2 || action == 4 { format!("{method}({arg}, {b})") } else { format!("{method}({arg})") };
        let before = read(self.session)?;
        if let Some(actor_id) = Self::actor_id(actor) {
            let receipt = self.session.call::<_,Result<u64,ContractError>>(actor_id,"perform",&(action,a,b),GAS).map_err(|e| e.to_string())?;
            self.push(actor,label,before,receipt.data.map(|n| if action == 0 { n.to_string() } else { "()".into() }),receipt.events)
        } else {
            let result = if action == 0 {
                self.session.call::<_,u64>(ID,method,&a,GAS).map(|r| (r.data.to_string(),r.events))
            } else if action == 2 || action == 4 {
                self.session.call::<_,()>(ID,method,&(a,b),GAS).map(|r| ("()".into(),r.events))
            } else {
                self.session.call::<_,()>(ID,method,&a,GAS).map(|r| ("()".into(),r.events))
            };
            let (result,events) = match result {
                Ok((value,events)) => (Ok(value),events),
                Err(Error::Panic(message)) => (Err(ContractError::Panic(message)),vec![]),
                Err(error) => return Err(error.to_string()),
            };
            self.push(actor,label,before,result,events)
        }
    }

    fn quote(&mut self, seats: u64) -> Result<(), String> {
        let before = read(self.session)?;
        let (result,events) = match self.session.call::<_,u64>(ID,"quote",&seats,GAS) {
            Ok(r) => (Ok(r.data.to_string()),r.events),
            Err(Error::Panic(message)) => (Err(ContractError::Panic(message)),vec![]),
            Err(error) => return Err(error.to_string()),
        };
        self.push("Query",format!("quote({seats})"),before,result,events)
    }

    fn limit(&mut self, limit: u64) -> Result<(), String> {
        let before = read(self.session)?;
        let r = self.session.call::<_,()>(VENUE,"set_limit",&limit,GAS).map_err(|e| e.to_string())?;
        self.push("Fixture",format!("set_limit({limit})"),before,Ok("()".into()),r.events)
    }

    fn venue(&mut self, offline: Option<bool>) -> Result<(), String> {
        let before = read(self.session)?;
        let (call,receipt) = if let Some(value) = offline {
            (format!("set_offline({value})"),self.session.call::<_,()>(VENUE,"set_offline",&value,GAS))
        } else { ("set_rate(4)".into(),self.session.call::<_,()>(VENUE,"set_rate",&4u64,GAS)) };
        let receipt = receipt.map_err(|e| e.to_string())?;
        self.push("Fixture",call,before,Ok("()".into()),receipt.events)
    }
}

pub fn calls(session: &mut Session, mode: &str) -> Result<Vec<Value>, String> {
    let phase = MODES.iter().position(|&m| m == mode).ok_or("Unknown advanced scenario")?;
    let wasm = std::fs::read("/work/actor.wasm").map_err(|e| e.to_string())?;
    for id in [A,B,TRANSFER_CONTRACT,VENUE] {
        session.deploy(&wasm,ContractData::builder().owner([0;32]).contract_id(id),GAS).map_err(|e| e.to_string())?;
    }
    let mut trace = Trace { session, phase, rows: Vec::new() };
    for actor in ["Query","A","B","Transfer"] { trace.current(actor)?; }
    if phase >= 1 {
        for (actor,amount) in [("Query",2),("Transfer",2),("A",2),("B",3),("A",0),("A",6),("A",5),("A",u64::MAX)] {
            trace.action(actor,0,amount,0)?;
        }
    }
    if phase >= 2 {
        for (actor,action,a) in [("B",1,0),("Query",1,0),("Transfer",1,0),("A",1,1),
            ("A",1,0),("A",1,0),("B",1,1),("A",0,2)] { trace.action(actor,action,a,0)?; }
    }
    if phase >= 3 {
        for (actor,id,seats) in [("B",2,4),("A",2,0),("A",2,9),("A",2,u64::MAX),
            ("A",2,4),("A",3,6),("A",3,2),("A",99,1),("Query",2,1)] { trace.action(actor,2,id,seats)?; }
    }
    if phase >= 6 {
        trace.quote(2)?; trace.quote(7)?; trace.venue(None)?; trace.quote(5)?;
        trace.venue(Some(true))?; trace.quote(1)?; trace.venue(Some(false))?; trace.quote(1)?;
    }
    if phase >= 7 {
        trace.action("B",3,2,0)?; trace.venue(Some(true))?; trace.action("A",3,2,0)?; trace.venue(Some(false))?;
        for (actor,action,a,b) in [("A",3,2,0),("A",3,2,0),("A",2,2,1),("A",1,2,0),("A",3,99,0),("Query",3,3,0)] {
            trace.action(actor,action,a,b)?;
        }
    }
    if phase >= 8 {
        for (actor,action,a,b) in [("A",0,3,0),("B",1,4,0),("A",2,4,4),("A",1,4,0),("A",0,1,0),("A",3,5,0),("A",1,5,0)] {
            trace.action(actor,action,a,b)?;
        }
    }
    if phase >= 9 {
        trace.action("A",0,1,0)?; trace.action("B",0,1,0)?;
        for (actor,a,b) in [("A",3,7),("A",3,3),("A",3,99),("B",3,7)] {
            trace.action(actor,4,a,b)?;
        }
        trace.limit(7)?; trace.action("A",4,3,6)?; trace.limit(10)?;
        trace.action("A",4,3,6)?; trace.action("A",4,3,6)?; trace.action("B",3,7,0)?;
    }
    Ok(trace.rows)
}
