import { NextRequest, NextResponse } from "next/server";
import { parseArticles } from "../../../lib/article-parser";
import { Criterion } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const articlesFile = formData.get("articles") as File;
    const criteriaJson = formData.get("criteria") as string;
    const sessionId = formData.get("sessionId") as string;
    const filename = formData.get("filename") as string || articlesFile.name;

    if (!articlesFile || !criteriaJson || !sessionId) {
      return NextResponse.json(
        { error: "Articles file, criteria, and session ID are required" },
        { status: 400 }
      );
    }

    // Parse criteria from JSON
    let criteria: Criterion[];
    try {
      criteria = JSON.parse(criteriaJson);
      if (!Array.isArray(criteria) || criteria.length === 0) {
        throw new Error("Invalid criteria format");
      }
    } catch (err) {
      console.error("Error parsing criteria:", err);
      return NextResponse.json(
        { error: "Invalid criteria format" },
        { status: 400 }
      );
    }

    // Convert criteria to text format (one per line)
    const criteriaText = criteria.map(c => c.text).join('\n');

    // Read file contents
    const articlesText = await articlesFile.text();

    // Parse articles from the file
    const articles = parseArticles(articlesText);

    if (articles.length === 0) {
      return NextResponse.json(
        { error: "No articles found in the uploaded file" },
        { status: 400 }
      );
    }

    // Check if session exists
    const { error: sessionCheckError } = await supabase
      .from("review_sessions")
      .select("id")
      .eq("id", sessionId)
      .single();

    if (sessionCheckError) {
      console.error("Error checking session:", sessionCheckError);
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    // Update the session data in Supabase with criteria text
    const { error: sessionError } = await supabase
      .from("review_sessions")
      .update({
        criteria: criteriaText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (sessionError) {
      console.error("Error updating session:", sessionError);
      return NextResponse.json(
        { error: "Failed to update review session" },
        { status: 500 }
      );
    }

    // Create a new file entry
    const { data: fileData, error: fileError } = await supabase
      .from("files")
      .insert({
        session_id: sessionId,
        filename: filename,
        articles_count: articles.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (fileError) {
      console.error("Error creating file entry:", fileError);
      return NextResponse.json(
        { error: "Failed to create file entry" },
        { status: 500 }
      );
    }

    const fileId = fileData.id;

    // Insert article entries for this file
    let insertedCount = 0;
    for (const article of articles) {
      const { error: articleError } = await supabase
        .from("articles")
        .insert({
          file_id: fileId,
          session_id: sessionId, // Keeping session_id for backward compatibility
          title: article.title,
          abstract: article.abstract,
          full_text: article.fullText,
          needs_review: true,
        });

      if (articleError) {
        console.error("Error inserting article:", articleError);
        // Continue with the rest of the articles even if one fails
      } else {
        insertedCount++;
      }
    }

    // If no articles were inserted successfully, delete the file entry
    if (insertedCount === 0) {
      await supabase
        .from("files")
        .delete()
        .eq("id", fileId);
        
      return NextResponse.json(
        { error: "Failed to insert any articles" },
        { status: 500 }
      );
    }

    // Update the file with the actual number of articles inserted
    await supabase
      .from("files")
      .update({ articles_count: insertedCount })
      .eq("id", fileId);

    return NextResponse.json({ 
      sessionId, 
      fileId,
      message: "File uploaded successfully",
      articleCount: insertedCount,
      criteriaCount: criteria.length,
      filename: filename
    });
  } catch (error) {
    console.error("Upload processing error:", error);
    return NextResponse.json(
      { error: "Failed to process the uploaded file" },
      { status: 500 }
    );
  }
} 