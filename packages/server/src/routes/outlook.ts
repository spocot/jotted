import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { platform } from "node:os";
import { asyncHandler } from "../lib/async-handler.js";

const execFileAsync = promisify(execFile);

interface OutlookEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  isAllDay: boolean;
}

const POWERShell_SCRIPT = `
$olFolderCalendar = 9
$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace("MAPI")
$calendar = $namespace.GetDefaultFolder($olFolderCalendar)
$items = $calendar.Items
$items.Sort("[Start]")
$result = @()
foreach ($item in $items) {
  if ($item.Class -ne 26) { continue }
  $result += @{
    id = $item.EntryID
    title = $item.Subject
    start = $item.Start.ToString("o")
    end = $item.End.ToString("o")
    location = $item.Location
    isAllDay = $item.AllDayEvent
  }
}
$outlook.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($outlook) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
Write-Output ($result | ConvertTo-Json -Compress)
`;

export function createOutlookRouter(): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const startDate = req.query.start as string | undefined;
      const endDate = req.query.end as string | undefined;

      if (platform() !== "win32") {
        res.json({
          events: [],
          available: false,
          message: "Outlook integration is only available on Windows",
        });
        return;
      }

      try {
        const { stdout } = await execFileAsync("powershell.exe", [
          "-NoProfile",
          "-Command",
          POWERShell_SCRIPT,
        ], { timeout: 15000 });

        let events: OutlookEvent[] = [];
        try {
          events = JSON.parse(stdout.trim());
        } catch {
          events = [];
        }

        if (startDate && endDate) {
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).getTime();
          events = events.filter((e) => {
            const eStart = new Date(e.start).getTime();
            return eStart >= start && eStart <= end;
          });
        }

        res.json({ events, available: true });
      } catch {
        res.json({
          events: [],
          available: false,
          message: "Outlook is not available. Make sure Outlook is installed and configured.",
        });
      }
    }),
  );

  return router;
}
