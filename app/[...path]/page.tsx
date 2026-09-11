import { AdminApp } from "../admin-app";
export default async function Page({params}:{params:Promise<{path:string[]}>}){const {path}=await params;return <AdminApp route={`/${path.join("/")}`}/>}
