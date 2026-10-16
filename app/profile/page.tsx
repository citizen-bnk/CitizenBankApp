import "./profile.css";
import SharedProfile from "@/components/SharedProfile";
import ProfileSettings from "@/components/ProfileSettings";
export default function ProfilePage(){return <><SharedProfile /><div className="citizen-profile" style={{minHeight:0}}><ProfileSettings /></div></>;}