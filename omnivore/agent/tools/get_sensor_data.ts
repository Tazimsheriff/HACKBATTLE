import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../../src/db/client";
import { sensorEvents } from "../../src/db/schema";
import { desc, eq, gte } from "drizzle-orm";

/**
 * Tool: get_sensor_data
 * Risk: LOW — auto-approved
 *
 * Retrieves the latest sensor data from the ESP32 device.
 * Returns temperature, humidity, door state, and recent history.
 */
export default defineTool({
  description:
    "Read the latest sensor data from the ESP32 cold-chain monitoring device. " +
    "Returns current temperature (°C), humidity (%), door open status, and recent history.",
  inputSchema: z.object({
    device_id: z
      .string()
      .optional()
      .default("esp32-s3-01")
      .describe("Device ID to query"),
    lookback_minutes: z
      .number()
      .optional()
      .default(30)
      .describe("How many minutes of history to retrieve"),
  }),
  execute: async ({ device_id, lookback_minutes }) => {
    const cutoff = new Date(Date.now() - lookback_minutes * 60 * 1000);

    const recentReadings = await db
      .select()
      .from(sensorEvents)
      .where(eq(sensorEvents.deviceId, device_id))
      .orderBy(desc(sensorEvents.createdAt))
      .limit(20);

    const latest = recentReadings[0];

    if (!latest) {
      return {
        device_id,
        status: "no_data",
        message: "No sensor data available. Device may not be connected.",
        latest: null,
        history: [],
      };
    }

    // Calculate temperature trend
    const temps = recentReadings
      .filter((r) => r.temperature !== null)
      .map((r) => r.temperature!);
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b) / temps.length : 0;
    const tempTrend =
      temps.length >= 2
        ? temps[0]! > temps[temps.length - 1]!
          ? "rising"
          : "falling"
        : "stable";

    return {
      device_id,
      status: "ok",
      latest: {
        temperature: latest.temperature,
        humidity: latest.humidity,
        door_open: latest.doorOpen,
        motion: latest.motion,
        timestamp: latest.createdAt,
      },
      statistics: {
        average_temperature: Math.round(avgTemp * 10) / 10,
        temperature_trend: tempTrend,
        reading_count: recentReadings.length,
      },
      history: recentReadings.slice(0, 5).map((r) => ({
        temperature: r.temperature,
        humidity: r.humidity,
        door_open: r.doorOpen,
        timestamp: r.createdAt,
      })),
    };
  },
});
