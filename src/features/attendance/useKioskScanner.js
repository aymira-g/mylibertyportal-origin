import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { getInstantPunctuality } from ".";
import {
  kioskClockInWithProof,
  clockOutShift,
  switchClassAtomic,
} from "./shiftsRepository";
import { soundEffects } from "./soundEffects";
import { triggerHaptic } from "../shared";
import { handleKioskScan } from "./kioskScanProcessor";
import { checkNetworkReachability } from "../../utils/networkReachability";

export function useKioskScanner({ studentsOnly = false, staffOnly = false } = {}) {
  const [kioskScanning, setKioskScanning] = useState(false);
  const [pendingClockIn, setPendingClockIn] = useState(null);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [nextClassId, setNextClassId] = useState("");
  const [status, setStatus] = useState({ message: "", type: "", detail: "", personName: "" });
  const [lastScanned, setLastScanned] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time digital clock display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showStatus = (message, type = "success", detail = "", personName = "") => {
    setStatus({ message, type, detail, personName });
    if (type === "success") {
      soundEffects.playSuccess();
      triggerHaptic("success");
    } else if (type === "info") {
      // Info notices: gentle display without error sound or vibration
    } else {
      soundEffects.playError();
      triggerHaptic("error");
    }
    // Auto-clear after 4.5 seconds
    setTimeout(() => {
      setStatus({ message: "", type: "", detail: "", personName: "" });
    }, 4500);
  };

  const cancelPendingClockIn = () => {
    setPendingClockIn(null);
    setSelectedClassId("");
  };

  const cancelPendingTransition = () => {
    setPendingTransition(null);
    setNextClassId("");
  };

  const createShift = async () => {
    if (!pendingClockIn) return;
    const isEvent = selectedClassId.startsWith("corporate_event:");
    const isGeneralDuty = selectedClassId === "general";
    const eventId = isEvent ? selectedClassId.replace("corporate_event:", "") : null;
    const eventsList =
      pendingClockIn.matchedEvents && pendingClockIn.matchedEvents.length > 0
        ? pendingClockIn.matchedEvents
        : pendingClockIn.matchedEvent
        ? [pendingClockIn.matchedEvent]
        : [];
    const event = isEvent ? eventsList.find((e) => e.id === eventId) : null;

    if (isEvent && !event) {
      showStatus(
        "Event Unavailable",
        "error",
        "The selected corporate event is no longer available or has expired.",
        pendingClockIn.userData?.displayName || ""
      );
      return;
    }

    const selectedClass = (!isEvent && !isGeneralDuty)
      ? pendingClockIn.classes?.find((cls) => cls.id === selectedClassId)
      : null;

    if (!isEvent && !isGeneralDuty && !selectedClass) return;

    const isReachable = await checkNetworkReachability();
    if (!isReachable) {
      showStatus(
        "Kiosk Offline",
        "error",
        "Cannot clock in: connection is offline or unstable. Please reconnect to branch Wi-Fi.",
        pendingClockIn?.userData?.displayName || ""
      );
      return;
    }

    try {
      const clockInAt = new Date();
      const isLeave = (pendingClockIn.userData.status || "active") === "on_leave";
      const name = pendingClockIn.userData.displayName;

      if (isEvent && event) {
        await kioskClockInWithProof({
          badgeToken: pendingClockIn.uid,
          role: pendingClockIn.userData.role,
          classId: `corporate_event:${event.id}`,
          className: event.name,
          shiftType: "corporate_event",
          eventId: event.id,
          punctuality: {
            status: "Present",
            scheduledStart: null,
            requiredArrival: null,
            minutesEarlyOrLate: 0,
          },
        });

        cancelPendingClockIn();
        showStatus(
          isLeave ? "Event Duty Started (On Leave)" : "Event Duty Started",
          "success",
          isLeave
            ? `Clocked in for ${event.name} (Note: Marked on Leave).`
            : `Clocked in for ${event.name}.`,
          name
        );
        return setLastScanned({
          name,
          role: pendingClockIn.userData.role,
          time: new Date(),
          type: `Clock In (${event.name})`,
        });
      }

      if (isGeneralDuty) {
        await kioskClockInWithProof({
          badgeToken: pendingClockIn.uid,
          role: pendingClockIn.userData.role,
          classId: "general",
          className: "General Duty",
          shiftType: null,
          eventId: null,
          punctuality: {
            status: "Present",
            scheduledStart: null,
            requiredArrival: null,
            minutesEarlyOrLate: 0,
          },
        });

        cancelPendingClockIn();
        showStatus(
          isLeave ? "Duty Started (On Leave)" : "Duty Started",
          "success",
          isLeave
            ? "Clocked in on General Administrative Duty (Note: Marked on Leave)."
            : "Clocked in on General Administrative Duty.",
          name
        );
        return setLastScanned({
          name,
          role: pendingClockIn.userData.role,
          time: new Date(),
          type: "Clock In",
        });
      }

      const punctuality = getInstantPunctuality(selectedClass, clockInAt);

      await kioskClockInWithProof({
        badgeToken: pendingClockIn.uid,
        classId: selectedClass.id,
        className: selectedClass.className,
        punctuality,
      });

      cancelPendingClockIn();
      showStatus(
        isLeave ? "Shift Confirmed (On Leave)" : "Shift Confirmed",
        "success",
        `Clocked in for ${selectedClass.className} (${punctuality.status})${isLeave ? " - Note: Marked on Leave" : ""}`,
        name
      );
      setLastScanned({
        name,
        role: pendingClockIn.userData.role,
        time: new Date(),
        type: "Clock In",
      });
    } catch (err) {
      showStatus("Clock-in Error", "error", err.message);
    }
  };

  const switchToNextClass = async () => {
    const nextClass = pendingTransition?.remainingClasses.find((cls) => cls.id === nextClassId);
    if (!pendingTransition || !nextClass) return;
    try {
      const now = new Date();
      const punctuality = getInstantPunctuality(nextClass, now);

      await switchClassAtomic({
        previousShiftId: pendingTransition.openShift.id,
        clockOutAt: now,
        uid: pendingTransition.uid,
        displayName: pendingTransition.userData.displayName,
        role: pendingTransition.userData.role,
        branchId: pendingTransition.userData.branchId || pendingTransition.openShift.branchId,
        branch: pendingTransition.userData.branch || pendingTransition.openShift.branch,
        classId: nextClass.id,
        className: nextClass.className,
        punctuality,
      });

      const name = pendingTransition.userData.displayName;
      showStatus(
        "Class Switched",
        "success",
        `Transitioned to ${nextClass.className} (${punctuality.status})`,
        name
      );
      setLastScanned({
        name,
        role: pendingTransition.userData.role,
        time: new Date(),
        type: "Switched",
      });
    } catch (err) {
      showStatus("Transition Error", "error", err.message);
    } finally {
      cancelPendingTransition();
    }
  };

  const clockOutOnly = async () => {
    if (!pendingTransition) return;
    try {
      await clockOutShift(pendingTransition.openShift.id);
      const name = pendingTransition.userData.displayName;
      showStatus("Clocked Out", "success", "Shift completed and archived.", name);
      setLastScanned({
        name,
        role: pendingTransition.userData.role,
        time: new Date(),
        type: "Clock Out",
      });
    } catch (err) {
      showStatus("Clock-out Error", "error", err.message);
    } finally {
      cancelPendingTransition();
    }
  };

  useEffect(() => {
    if (!kioskScanning) return;
    const scanner = new Html5QrcodeScanner(
      "kiosk-reader",
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      },
      /* verbose= */ false
    );

    scanner.render(
      async (uid) => {
        scanner.clear();
        setKioskScanning(false);
        const isReachable = await checkNetworkReachability();
        if (!isReachable) {
          showStatus(
            "Kiosk Offline",
            "error",
            "Network required for attendance scanning. Reconnect to branch Wi-Fi."
          );
          return;
        }
        try {
          await handleKioskScan(uid, {
            studentsOnly,
            staffOnly,
            showStatus,
            setLastScanned,
            setPendingClockIn,
            setPendingTransition,
          });
        } catch (err) {
          showStatus("Scanner Error", "error", err.message);
        }
      },
      () => {}
    );
    return () => {
      try {
        scanner.clear();
      } catch {
        // Safe unmount
      }
    };
  }, [kioskScanning, studentsOnly, staffOnly]);

  return {
    kioskScanning,
    setKioskScanning,
    pendingClockIn,
    cancelPendingClockIn,
    pendingTransition,
    cancelPendingTransition,
    selectedClassId,
    setSelectedClassId,
    nextClassId,
    setNextClassId,
    status,
    lastScanned,
    currentTime,
    createShift,
    switchToNextClass,
    clockOutOnly,
  };
}
