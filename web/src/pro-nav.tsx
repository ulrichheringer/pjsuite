import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getNotifications, type Notifications } from "@/api";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notifications>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getNotifications().then((outcome) => {
      if (outcome.kind !== "ok") return setFailed(true);
      setNotifications(outcome.value);
    });
  }, []);

  return { notifications, setNotifications, failed };
}

export function ProNav({ unread }: { unread: number }) {
  return (
    <nav className="pro-nav">
      <Link to="/projetos">Projetos</Link>
      <Link to="/clientes">Clientes</Link>
      <Link to="/avisos">Avisos {unread > 0 && <span className="tab-count">{unread}</span>}</Link>
    </nav>
  );
}
