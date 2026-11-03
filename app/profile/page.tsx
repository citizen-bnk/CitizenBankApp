import "./profile.css";
import SharedProfile from "@/components/SharedProfile";
import ProfileSettings from "@/components/ProfileSettings";
export default function ProfilePage(){return <><SharedProfile/><details className="citizen-profile compact-settings"><summary>Settings &amp; security</summary><ProfileSettings/></details></>;}
