const assert=require('node:assert/strict');
const sharing=require('../public/mobile/account-sharing.js');
const text=sharing.details({name:'My savings',type:'SAVINGS',number:'0123456789',currency:'LSL',balance:'25000',pin:'secret-pin'},'Investor Example');
assert.ok(text.includes('Account holder: Investor Example'));
assert.ok(text.includes('Account number: 0123456789'));
assert.ok(text.includes('Account type: Savings'));
assert.ok(text.includes('Do not send real money'));
assert.ok(!text.includes('25000'));assert.ok(!text.includes('secret-pin'));
assert.equal(new URLSearchParams(sharing.emailLink(text+' & #?').split('?')[1]).get('body'),text+' & #?');
assert.ok(sharing.details({name:'Crypto',type:'CRYPTO',number:'0123456789',currency:'LSL'},'Investor').includes('not a blockchain wallet'));
console.log('Mobile banking details privacy, pre-licensing notice and email encoding passed.');

// Exercise the popup's real handlers without sending messages or using customer data.
class Element {
 constructor(){this.children=new Map();this.listeners={};this.isConnected=true;}
 querySelector(key){if(!this.children.has(key))this.children.set(key,new Element());return this.children.get(key);}
 setAttribute(){} addEventListener(key,fn){this.listeners[key]=fn;}
 focus(){this.focused=true;} select(){this.selected=true;}
 showModal(){this.open=true;} close(){this.open=false;this.listeners.close?.();}
 remove(){this.isConnected=false;}
}
(async()=>{
 let popup,shared,copied;
 global.document={getElementById(){return popup?.isConnected?popup:null;},createElement(){return new Element();},body:{appendChild(el){popup=el;}}};
 Object.defineProperty(global,'navigator',{configurable:true,value:{clipboard:{async writeText(value){copied=value;}},async share(value){shared=value;}}});
 const trigger=new Element(),account={name:'Savings',type:'SAVINGS',number:'0123456789',currency:'LSL'};
 sharing.open(account,'Investor Example',trigger);
 assert.equal(popup.open,true);
 await popup.querySelector('[data-action="copy"]').onclick();
 assert.equal(copied,sharing.details(account,'Investor Example'));
 await popup.querySelector('[data-action="share"]').onclick();
 assert.equal(shared.text,copied);assert.equal(popup.open,true);
 navigator.share=async()=>{throw {name:'AbortError'};};
 await popup.querySelector('[data-action="share"]').onclick();
 assert.equal(popup.querySelector('[role="status"]').textContent,'');
 navigator.share=undefined;
 await popup.querySelector('[data-action="share"]').onclick();
 assert.match(popup.querySelector('[role="status"]').textContent,/Choose Copy or Email/);
 navigator.clipboard=undefined;
 await popup.querySelector('[data-action="copy"]').onclick();
 assert.equal(popup.querySelector('textarea').selected,true);
 popup.querySelector('.account-sharing-close').onclick();
 assert.equal(popup.isConnected,false);assert.equal(trigger.focused,true);
 console.log('Popup copy, native sharing, cancellation, fallback and focus recovery passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
