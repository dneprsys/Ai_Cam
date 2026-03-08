import { NextRequest, NextResponse } from "next/server";

// MediaMTX Control API
// This endpoint proxies commands to MediaMTX API for path management

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, host, port = 9997, streamName, rtspSource } = body;

    if (!host) {
      return NextResponse.json(
        { error: "MediaMTX host is required" },
        { status: 400 }
      );
    }

    const baseUrl = `http://${host}:${port}/v3`;

    switch (action) {
      case "status": {
        // Check if MediaMTX is running
        const response = await fetch(`${baseUrl}/paths/list`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            status: "running",
            paths: data.items || [],
          });
        } else {
          return NextResponse.json({ status: "error", message: "Cannot connect to MediaMTX" });
        }
      }

      case "add-path": {
        // Add a new RTSP source path
        if (!streamName || !rtspSource) {
          return NextResponse.json(
            { error: "streamName and rtspSource are required" },
            { status: 400 }
          );
        }

        const pathConfig = {
          name: streamName,
          source: rtspSource,
          sourceOnDemand: true,
          sourceOnDemandStartTimeout: "10s",
          sourceOnDemandCloseAfter: "10s",
        };

        const response = await fetch(`${baseUrl}/config/paths/add/${streamName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pathConfig),
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          return NextResponse.json({ success: true, message: `Path ${streamName} added` });
        } else {
          const error = await response.text();
          return NextResponse.json({ error: `Failed to add path: ${error}` }, { status: 500 });
        }
      }

      case "remove-path": {
        // Remove a path
        if (!streamName) {
          return NextResponse.json(
            { error: "streamName is required" },
            { status: 400 }
          );
        }

        const response = await fetch(`${baseUrl}/config/paths/delete/${streamName}`, {
          method: "DELETE",
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          return NextResponse.json({ success: true, message: `Path ${streamName} removed` });
        } else {
          const error = await response.text();
          return NextResponse.json({ error: `Failed to remove path: ${error}` }, { status: 500 });
        }
      }

      case "get-path": {
        // Get path info
        if (!streamName) {
          return NextResponse.json(
            { error: "streamName is required" },
            { status: 400 }
          );
        }

        const response = await fetch(`${baseUrl}/paths/get/${streamName}`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ path: data });
        } else {
          return NextResponse.json({ error: "Path not found" }, { status: 404 });
        }
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("[v0] MediaMTX API error:", error);
    
    if (error.name === "TimeoutError" || error.code === "ETIMEDOUT") {
      return NextResponse.json(
        { error: "MediaMTX connection timeout - server may be offline" },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const host = searchParams.get("host");
  const port = searchParams.get("port") || "9997";

  if (!host) {
    return NextResponse.json(
      { error: "host parameter is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`http://${host}:${port}/v3/paths/list`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: "running",
        paths: data.items || [],
      });
    } else {
      return NextResponse.json({ status: "stopped" });
    }
  } catch {
    return NextResponse.json({ status: "offline" });
  }
}
