(function(root){
 'use strict';
 function details(account,holder){
  var label={CURRENT:'Cheque',SAVINGS:'Savings',FIXED_DEPOSIT:'Fixed deposit',CRYPTO:'Crypto sandbox'}[account.type]||account.type;
  return ['Citizen Bank','Account holder: '+holder,'Account: '+account.name,'Account type: '+label,'Account number: '+account.number,'Currency: '+account.currency,'','Pre-licensing test account — fictional funds only. Do not send real money to this account.'].concat(account.type==='CRYPTO'?['This is a crypto sandbox account, not a blockchain wallet address.']:[]).join('\n');
 }
 function emailLink(text){return 'mailto:?subject='+encodeURIComponent('My Citizen banking details')+'&body='+encodeURIComponent(text);}
 var icons={copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 11 6-4M9 13l6 4"/>',more:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'};
 function icon(name){return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';}
 function open(account,holder,trigger){
  var previous=document.getElementById('account-sharing-dialog');if(previous){previous.close();previous.remove();}
  var text=details(account,holder),dialog=document.createElement('dialog');
  dialog.id='account-sharing-dialog';dialog.className='account-sharing-dialog';dialog.setAttribute('aria-labelledby','account-sharing-title');
  dialog.innerHTML='<header><h2 id="account-sharing-title">Share banking details</h2><button type="button" class="account-sharing-close" aria-label="Close banking details">×</button></header><p class="account-sharing-name"></p><textarea class="account-sharing-text" readonly aria-label="Banking details to share"></textarea><div class="account-sharing-actions"><button type="button" data-action="copy">'+icon('copy')+'<span>Copy</span></button><a data-action="email">'+icon('mail')+'<span>Email</span></a><button type="button" data-action="share">'+icon('share')+'<span>Share</span></button></div><p class="account-sharing-status" role="status" aria-live="polite"></p>';
  dialog.querySelector('.account-sharing-name').textContent=account.name;
  var area=dialog.querySelector('textarea'),status=dialog.querySelector('[role="status"]');area.value=text;
  var email=dialog.querySelector('[data-action="email"]');email.href=emailLink(text);email.onclick=function(){status.textContent='Your email app will open. Choose a recipient, review and send.';};
  dialog.querySelector('[data-action="copy"]').onclick=async function(){
   try{await navigator.clipboard.writeText(text);status.textContent='Banking details copied.';}
   catch(error){area.focus();area.select();status.textContent='Copy is unavailable. Your details are selected; use your device’s Copy option.';}
  };
  var share=dialog.querySelector('[data-action="share"]');share.onclick=async function(){
   if(!navigator.share){status.textContent='Device sharing is unavailable in this browser. Choose Copy or Email instead.';return;}
   share.disabled=true;status.textContent='';
   try{await navigator.share({title:'My Citizen banking details',text:text});status.textContent='Sharing completed.';}
   catch(error){if(error.name!=='AbortError')status.textContent='Sharing could not open. Try Copy or Email instead.';}
   finally{share.disabled=false;}
  };
  dialog.querySelector('.account-sharing-close').onclick=function(){dialog.close();};
  dialog.addEventListener('click',function(e){if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',function(){dialog.remove();if(trigger&&trigger.isConnected)trigger.focus();});
  document.body.appendChild(dialog);dialog.showModal();
 }
 var api={details:details,emailLink:emailLink,icon:icon,open:open};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CitizenAccountSharing=api;
})(typeof window==='undefined'?globalThis:window);
