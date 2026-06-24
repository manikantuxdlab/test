import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession, usePendingAck } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/mock-data";

/** Crewman routes (Schedule, Docs, Contacts) — must be logged in & all acks complete. */
export function useFieldGuard() {
  const navigate = useNavigate();
  const { user, selectedMarket, setSelectedMarket, isHydrated } = useSession();
  const { pending, isCrewman } = usePendingAck();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    // Auto-select the user's home market so a freshly-logged-in foreman / crewman
    // doesn't get bounced back to "/" because no market was picked yet.
    if (!selectedMarket) {
      setSelectedMarket(user.market);
      return;
    }
    if (isCrewman && pending > 0) navigate({ to: "/acknowledge" });
  }, [user, selectedMarket, setSelectedMarket, pending, isCrewman, navigate, isHydrated]);
}

/** Staff/Admin routes — must be logged in & a staff role. */
export function useStaffGuard() {
  const navigate = useNavigate();
  const { user, isHydrated } = useSession();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!STAFF_ROLES.includes(user.role)) navigate({ to: "/" });
  }, [user, navigate, isHydrated]);
}

/** Foreman, warehouse, and staff/admin routes — can access full schedule tools. */
export function useScheduleAccessGuard() {
  const navigate = useNavigate();
  const { user, isHydrated } = useSession();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!["admin", "staff"].includes(user.role)) {
      navigate({ to: "/" });
    }
  }, [user, navigate, isHydrated]);
}
