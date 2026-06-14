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
$ErrorActionPreference = "Stop"
$olFolderCalendar = 9
$outlook = $null
$namespace = $null
$calendar = $null

try {
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

  $json = ConvertTo-Json -InputObject $result -Compress
  if ([string]::IsNullOrWhiteSpace($json)) { $json = "[]" }
  Write-Output $json
} catch {
  Write-Error $_.Exception.Message
  exit 1
} finally {
  if ($calendar -ne $null) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($calendar) }
  if ($namespace -ne $null) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($namespace) }
  if ($outlook -ne $null) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($outlook) }
  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}
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
        const { stdout, stderr } = await execFileAsync("powershell.exe", [
          "-NoProfile",
          "-Command",
          POWERShell_SCRIPT,
        ], { timeout: 15000 });
        if (stderr.trim()) {
          throw new Error(stderr.trim());
        }

        let events: OutlookEvent[] = [];
        try {
          const parsed = JSON.parse(stdout.trim());
          events = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
        } catch {
          events = [];
        }

        if (startDate && endDate) {
          const start = new Date(`${startDate}T00:00:00`).getTime();
          const end = new Date(`${endDate}T23:59:59.999`).getTime();
          events = events.filter((e) => {
            const eStart = new Date(e.start).getTime();
            const eEnd = new Date(e.end).getTime();
            return eEnd >= start && eStart <= end;
          });
        }

        res.json({ events, available: true });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        res.json({
          events: [],
          available: false,
          message: `Outlook COM is not available. Install/configure classic Outlook desktop. Details: ${reason}`,
        });
      }
    }),
  );

  return router;
}
