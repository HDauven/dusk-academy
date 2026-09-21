// Compatibility entry point for the opening scenario and its native comparisons.
import {createContract, simulateContract} from './contract-simulator.js';
export function createCounter(source) {
  const instance=createContract(source);
  return {call(name){
    if(!['get_count','register'].includes(name))throw Error('The simulator exposes only get_count and parameterless register.');
    const r=instance.call(name);
    if(r.rejected)throw Error('Simulator execution stopped: '+r.error+'. The call was rolled back.');
    return r.value;
  }};
}
export const simulateCounter=source=>simulateContract(source,'state');
