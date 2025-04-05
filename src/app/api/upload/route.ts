// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseArticles } from "@/lib/article-parser";
import { insertFile, insertArticles, deleteFile } from "@/lib/utils/supabase-utils";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;
    const file = formData.get("file") as File;

    if (!sessionId || !file) {
      return NextResponse.json({ error: "Session ID and file are required." }, { status: 400 });
    }

    const fileText = await file.text();
    if (!fileText.trim()) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    const articles = parseArticles(fileText);
    if (articles.length === 0) {
      return NextResponse.json({ error: "No articles found in file." }, { status: 400 });
    }

    const fileId = await insertFile(sessionId, file.name, articles.length);

    try {
      const insertedCount = await insertArticles(fileId, articles);
      
      return NextResponse.json({
        success: true,
        filename: file.name,
        fileId,
        articleCount: insertedCount,
      });

    } catch (error) {
      // If article insertion fails, delete the file record
      await deleteFile(fileId);

      console.error("Error inserting articles:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to insert articles." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error during upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
