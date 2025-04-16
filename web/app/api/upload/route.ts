// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseArticles } from "@/lib/article-parser";
import { insertFile, insertArticles, deleteFile } from "@/lib/utils/supabase-utils";
import { ParsedArticle } from "@/lib/types";

// Update the type for the selectedArticles mapping
type SelectedArticle = {
  title: string;
  abstract: string;
  hash?: string;
  sourceFile: string;
  isDuplicate?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;
    const file = formData.get("file") as File;
    const selectedArticlesJson = formData.get("selectedArticles") as string | null;

    if (!sessionId || !file) {
      return NextResponse.json({ error: "Session ID and file are required." }, { status: 400 });
    }

    let articles: ParsedArticle[] = [];

    // Check if we have pre-selected articles
    if (selectedArticlesJson) {
      try {
        const selectedArticles = JSON.parse(selectedArticlesJson);
        // Convert the selected articles to the format expected by insertArticles
        articles = selectedArticles.map((article: SelectedArticle, index: number) => ({
          id: index + 1,
          title: article.title,
          abstract: article.abstract,
          fullText: article.abstract // We don't have full text in the preview, so use abstract as a fallback
        }));
      } catch (e) {
        console.error("Error parsing selectedArticles JSON:", e);
        return NextResponse.json({ error: "Invalid selected articles format." }, { status: 400 });
      }
    } else {
      // No pre-selected articles, parse all from the file
      const fileText = await file.text();
      if (!fileText.trim()) {
        return NextResponse.json({ error: "File is empty." }, { status: 400 });
      }

      articles = parseArticles(fileText);
      if (articles.length === 0) {
        return NextResponse.json({ error: "No articles found in file." }, { status: 400 });
      }
    }

    // Ensure we have articles to insert
    if (articles.length === 0) {
      return NextResponse.json({ error: "No articles to insert." }, { status: 400 });
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
