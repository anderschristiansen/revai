import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseArticles } from "../../../lib/article-parser";
import { Criterion } from "@/lib/types";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const articlesFile = formData.get("articles") as File;
    const criteriaJson = formData.get("criteria") as string;
    const sessionId = formData.get("sessionId") as string;

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
        articles_count: articles.length,
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

    // Clear existing articles for this session
    const { error: deleteArticlesError } = await supabase
      .from("articles")
      .delete()
      .eq("session_id", sessionId);

    if (deleteArticlesError) {
      console.error("Error clearing existing articles:", deleteArticlesError);
      // Continue anyway
    }

    // Insert initial article entries
    for (const article of articles) {
      const { error: articleError } = await supabase
        .from("articles")
        .insert({
          session_id: sessionId,
          title: article.title,
          abstract: article.abstract,
          full_text: article.fullText,
          needs_review: true,
        });

      if (articleError) {
        console.error("Error inserting article:", articleError);
        // Continue with the rest of the articles even if one fails
      }
    }

    return NextResponse.json({ 
      sessionId, 
      message: "Files uploaded successfully",
      articleCount: articles.length,
      criteriaCount: criteria.length
    });
  } catch (error) {
    console.error("Upload processing error:", error);
    return NextResponse.json(
      { error: "Failed to process the uploaded files" },
      { status: 500 }
    );
  }
} 