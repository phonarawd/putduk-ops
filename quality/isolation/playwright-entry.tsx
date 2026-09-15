import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "../../app/admin-app";
import "../../app/admin.css";

function currentRoute(): string {
  return window.location.pathname || "/";
}

function Root() {
  const [route, setRoute] = useState(currentRoute());
  useEffect(() => {
    const sync = () => setRoute(currentRoute());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return <AdminApp route={route} />;
}

const root = document.getElementById("root");
if (!root) throw new Error("playwright root missing");
createRoot(root).render(<Root />);
