import {useRef} from "react";
import {AlertTriangle,CheckCircle2,CloudOff,Download,HardDrive,LockKeyhole,RefreshCw,ShieldCheck,Upload,Bell,BrainCircuit} from "lucide-react";
import {createBackup,parseBackup,type AppData} from "../core/storage";
import {SYSTEM_CAPABILITIES,type NotificationAccess} from "../core/permissions";
import "./SettingsSecurity.css";

type Props={
 data:AppData;
 storageHealthy:boolean;
 notificationAccess:NotificationAccess;
 onRequestNotifications:()=>Promise<void>;
 onRestore:(data:AppData,warning?:string)=>void;
 onReset:()=>void;
};
export default function SettingsSecurity({data,storageHealthy,notificationAccess,onRequestNotifications,onRestore,onReset}:Props){
 const fileRef=useRef<HTMLInputElement>(null);
 const exportBackup=()=>{
  const blob=new Blob([JSON.stringify(createBackup(data),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download="arvena-backup.json";a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const importBackup=(file?:File)=>{
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
   try{
    const result=parseBackup(JSON.parse(String(reader.result)));
    if(!result.ok){window.alert(result.error);return;}
    const accepted=window.confirm("Restore this backup? It will replace the current ARVENA data on this device. Export a backup first if you need to keep the current data.");
    if(accepted)onRestore(result.value,result.warning);
   }catch{window.alert("This file could not be read as a valid ARVENA backup.");}
   finally{if(fileRef.current)fileRef.current.value="";}
  };
  reader.onerror=()=>{window.alert("The backup file could not be read.");if(fileRef.current)fileRef.current.value="";};
  reader.readAsText(file);
 };
 const statusLabel:Record<NotificationAccess,string>={unsupported:"Not supported by this browser",default:"Not enabled",granted:"Allowed by browser",denied:"Blocked in browser settings"};
 const capabilities=[
  ["Local device storage",SYSTEM_CAPABILITIES.localPersistence,"Your records are saved in this browser."],
  ["Cross-tab updates",SYSTEM_CAPABILITIES.crossTabSync,"Open ARVENA tabs can receive storage updates."],
  ["Versioned backup",SYSTEM_CAPABILITIES.versionedBackup,"Export and restore a portable JSON backup."],
  ["Browser notifications",SYSTEM_CAPABILITIES.browserNotifications,"Permission is requested only after your action."],
  ["Cloud sync",SYSTEM_CAPABILITIES.cloudSync,"No account or remote database is connected."],
  ["Remote AI",SYSTEM_CAPABILITIES.remoteAI,"AI is not connected; no AI analysis is happening in the background."],
  ["Encrypted storage",SYSTEM_CAPABILITIES.encryptedStorage,"Browser records and backups are not encrypted by this build."],
  ["External actions",SYSTEM_CAPABILITIES.externalActions,"ARVENA does not perform external actions in this build."]
 ] as const;
 return <div className="ss-wrap">
  <header className="ss-hero"><div><span>CONTROL & PRIVACY</span><h1>Settings & Security</h1><p>Manage your device data, backups, browser permissions and connected capabilities.</p></div><ShieldCheck size={34}/></header>
  <section className="ss-panel"><div className="ss-title"><HardDrive/><div><h2>Local data integrity</h2><p>Your original ULS storage key is preserved.</p></div><b className={storageHealthy?"ss-good":"ss-warn"}>{storageHealthy?"READY":"CHECK REQUIRED"}</b></div>
   <div className="ss-facts"><div><small>Storage location</small><b>This browser / device</b></div><div><small>Storage key</small><b><code>uls-data-v1</code></b></div><div><small>Data collections</small><b>{Object.values(data).filter(Array.isArray).reduce((n,x)=>n+x.length,0)} records</b></div></div>
   <p className="ss-note">ARVENA currently uses browser local storage. Clearing browser data, uninstalling the browser or changing devices can make these records unavailable. Keep an external backup. If saved data is corrupt or from a newer app version, ARVENA protects it from automatic replacement.</p>
  </section>
  <section className="ss-panel"><div className="ss-title"><RefreshCw/><div><h2>Backup & restore</h2><p>Keep an independent copy of your progress.</p></div></div>
   <div className="ss-actions"><button className="ss-primary" onClick={exportBackup}><Download size={16}/> Export versioned backup</button><button className="ss-secondary" onClick={()=>fileRef.current?.click()}><Upload size={16}/> Restore from backup</button><input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={e=>importBackup(e.currentTarget.files?.[0])}/></div>
   <p className="ss-note">Restore replaces the current local records after confirmation. The backup contains ARVENA records and progression data; the YouTube API key is excluded. Store backup files somewhere private.</p>
  </section>
  <section className="ss-panel"><div className="ss-title"><Bell/><div><h2>Browser permissions</h2><p>Permissions are optional and controlled by you.</p></div></div>
   <div className="ss-permission"><div><b>Notifications</b><span>{statusLabel[notificationAccess]}</span></div><button className="ss-secondary" disabled={notificationAccess==="unsupported"||notificationAccess==="denied"||notificationAccess==="granted"} onClick={onRequestNotifications}>{notificationAccess==="granted"?"Enabled":notificationAccess==="denied"?"Change in browser settings":"Enable notifications"}</button></div>
   {notificationAccess==="denied"&&<p className="ss-note">Notifications are blocked by your browser. Change the permission for this site in the browser's site settings; ARVENA cannot override a browser denial.</p>}
  </section>
  <section className="ss-panel"><div className="ss-title"><LockKeyhole/><div><h2>Capability & privacy status</h2><p>These labels reflect actual integrations in this build.</p></div></div>
   <div className="ss-capabilities">{capabilities.map(([name,enabled,detail])=><div key={name}><div className="ss-cap-name">{enabled?<CheckCircle2/>:<CloudOff/>}<b>{name}</b><span className={enabled?"ss-on":"ss-off"}>{enabled?"Available":"Not connected"}</span></div><p>{detail}</p></div>)}</div>
   <div className="ss-warning"><BrainCircuit/><p><b>AI status: disconnected.</b> Your journal, goals and other private records are not being sent to an AI service by ARVENA. Cloud sync, login/authentication and encrypted local storage are also not implemented.</p></div>
  </section>
  <section className="ss-panel ss-danger-panel"><div className="ss-title"><AlertTriangle/><div><h2>Reset local data</h2><p>Use only when you intentionally want to erase this browser's ARVENA records.</p></div></div>
   <button className="ss-danger" onClick={()=>{if(window.confirm("Permanently delete all ARVENA records stored in this browser? This cannot be undone. Export a backup first if you may need this data."))onReset();}}>Reset all local data</button>
   <p className="ss-note">This does not revoke browser notification permission or remove the separate YouTube API key. Those are managed by browser/site settings and the Video Learning Studio.</p>
  </section>
 </div>;
}
