import { NextRequest, NextResponse } from "next/server";
import { parseArticles } from "../../../lib/article-parser";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;
    const file = formData.get("file") as File;
  
    if (!sessionId || !file) {
      return NextResponse.json(
        { error: "Session ID and file are required" },
        { status: 400 }
      );
    }

    // Read and validate file contents
    let articlesText: string;
    try {
      articlesText = await file.text();
    } catch (error) {
      console.error("Error reading file:", error);
      return NextResponse.json(
        { error: "Failed to read file content" },
        { status: 400 }
      );
    }

    if (!articlesText.trim()) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      );
    }

    // Parse articles
    let articles;
    try {
      articles = parseArticles(articlesText);
    } catch (error) {
      console.error("Error parsing articles:", error);
      return NextResponse.json(
        { error: "Failed to parse articles from file" },
        { status: 400 }
      );
    }

    if (articles.length === 0) {
      return NextResponse.json(
        { error: "No articles found in file" },
        { status: 400 }
      );
    }

    // Create file entry
    const { data: fileData, error: fileError } = await supabase
      .from("files")
      .insert({
        session_id: sessionId,
        filename: file.name,
        articles_count: articles.length,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (fileError) {
      console.error("Error creating file entry:", fileError);
      return NextResponse.json(
        { error: `Failed to create file entry: ${fileError.message}` },
        { status: 500 }
      );
    }

    // Insert articles
    const fileId = fileData.id;
    let insertedCount = 0;
    const errors: string[] = [];

    for (const article of articles) {
      try {
        const { error: articleError } = await supabase
          .from("articles")
          .insert({
            file_id: fileId,
            title: article.title,
            abstract: article.abstract,
            full_text: article.fullText,
            needs_review: true,
            created_at: new Date().toISOString(),
          });

        if (articleError) {
          errors.push(`Failed to insert article: ${articleError.message}`);
        } else {
          insertedCount++;
        }
      } catch (error) {
        console.error("Error inserting article:", error);
        errors.push(`Failed to insert article: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // If no articles were inserted, clean up and return error
    if (insertedCount === 0) {
      await supabase
        .from("files")
        .delete()
        .eq("id", fileId);
        
      return NextResponse.json(
        { 
          error: "Failed to insert any articles",
          details: errors
        },
        { status: 500 }
      );
    }

    // Update file with actual article count
    await supabase
      .from("files")
      .update({ articles_count: insertedCount })
      .eq("id", fileId);

    return NextResponse.json({ 
      success: true,
      filename: file.name,
      fileId,
      articleCount: insertedCount,
      warnings: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Upload processing error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process the uploaded file",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 