import {redirect} from 'next/navigation';
/** Access is assigned through canonical, audited Hub administration. */
export default function ActivateAdmin(){redirect((process.env.NEXT_PUBLIC_HUB_URL||'https://hub.citizenbank.co.ls')+'/users#');}
