import { NextRequest, NextResponse } from "next/server";
import { parseArticles } from "../../../lib/article-parser";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;
    
    // Check if we're dealing with multiple files or a single file
    const articlesFiles: File[] = [];
    const filenames: string[] = [];
    
    // Get all files from the form data
    for (const [key, value] of formData.entries()) {
      if (key === 'articles' && value instanceof File) {
        const fileIndex = articlesFiles.length;
        articlesFiles.push(value);
        
        // Try to get the corresponding filename if available
        const filenameKey = `filenames[${fileIndex}]`;
        const explicitFilename = formData.get(filenameKey);
        filenames.push(explicitFilename ? String(explicitFilename) : value.name);
      }
    }

    // If no files were found, check for single file mode (backward compatibility)
    if (articlesFiles.length === 0) {
      const singleFile = formData.get("articles") as File;
      const filename = formData.get("filename") as string || singleFile?.name;
      
      if (singleFile) {
        articlesFiles.push(singleFile);
        filenames.push(filename);
      }
    }

    if (articlesFiles.length === 0 || !sessionId) {
      return NextResponse.json(
        { error: "Articles files and session ID are required" },
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

    // Process each file
    let totalArticleCount = 0;
    const processedFiles = [];

    for (let i = 0; i < articlesFiles.length; i++) {
      const file = articlesFiles[i];
      const filename = filenames[i];
      
      // Read file contents
      const articlesText = await file.text();

      // Parse articles from the file
      const articles = parseArticles(articlesText);

      if (articles.length === 0) {
        // Skip this file but continue with others
        processedFiles.push({
          filename,
          success: false,
          error: "No articles found in file",
          articleCount: 0
        });
        continue;
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
        processedFiles.push({
          filename,
          success: false,
          error: "Failed to create file entry",
          articleCount: 0
        });
        continue;
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
          
        processedFiles.push({
          filename,
          success: false,
          error: "Failed to insert any articles",
          articleCount: 0
        });
        continue;
      }

      // Update the file with the actual number of articles inserted
      await supabase
        .from("files")
        .update({ articles_count: insertedCount })
        .eq("id", fileId);
      
      totalArticleCount += insertedCount;
      processedFiles.push({
        filename,
        success: true,
        fileId,
        articleCount: insertedCount
      });
    }

    if (totalArticleCount === 0) {
      return NextResponse.json(
        { error: "Failed to process any articles from the uploaded files" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      sessionId,
      message: "Files processed successfully",
      totalArticlesCount: totalArticleCount,
      filesCount: processedFiles.length,
      files: processedFiles
    });
  } catch (error) {
    console.error("Upload processing error:", error);
    return NextResponse.json(
      { error: "Failed to process the uploaded files" },
      { status: 500 }
    );
  }
} 