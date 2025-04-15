import { NextRequest, NextResponse } from "next/server";
import { getArticleById, updateArticleEvaluation, getSessionCriteriasBySessionId, getSessionIdByFileId } from "@/lib/utils/supabase-utils";
import { Article } from "@/lib/types";
import { createClient } from '@supabase/supabase-js';

type ErrorResponse = {
  error: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const articleId = (await params).id;
    const body = await request.json();
    const { title, abstract, fileId } = body;

    if (!title || !abstract || !fileId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the session ID and criteria
    let sessionId;
    let criterias;
    try {
      sessionId = await getSessionIdByFileId(fileId);
      criterias = await getSessionCriteriasBySessionId(sessionId);
    } catch (error) {
      console.error('Error getting session criteria:', error);
      return NextResponse.json(
        { error: 'Failed to get evaluation criteria' },
        { status: 500 }
      );
    }

    // Format the criteria string
    let formattedCriteria = '';
    
    const inclusionCriteria = criterias
      .filter((c: { text: string, type: string }) => c.type === 'inclusion')
      .map((c: { text: string }) => c.text);
      
    const exclusionCriteria = criterias
      .filter((c: { text: string, type: string }) => c.type === 'exclusion')
      .map((c: { text: string }) => c.text);
    
    if (inclusionCriteria.length > 0) {
      formattedCriteria += `INCLUSION CRITERIA:\n${inclusionCriteria.join('\n')}\n\n`;
    } else {
      formattedCriteria += `INCLUSION CRITERIA: None provided\n\n`;
    }
    
    if (exclusionCriteria.length > 0) {
      formattedCriteria += `EXCLUSION CRITERIA:\n${exclusionCriteria.join('\n')}`;
    } else {
      formattedCriteria += `EXCLUSION CRITERIA: None provided`;
    }

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('evaluate-articles', {
      body: {
        articleId,
        title,
        abstract,
        criteria: formattedCriteria,
      }
    });

    if (error) {
      console.error('Error calling evaluate-articles function:', error);
      return NextResponse.json(
        { error: 'Failed to evaluate article' },
        { status: 500 }
      );
    }

    if (!data || !data.decision || !data.explanation) {
      console.error('Invalid response from evaluate-articles function:', data);
      return NextResponse.json(
        { error: 'Invalid response from evaluation service' },
        { status: 500 }
      );
    }

    // Update the article in the database
    await updateArticleEvaluation(articleId, data.decision, data.explanation);

    return NextResponse.json({
      decision: data.decision,
      explanation: data.explanation,
    });
  } catch (error) {
    console.error('Error in evaluates API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<Partial<Article> | ErrorResponse>> {
  try {
    const articleId = (await params).id;
    if (!articleId) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    const article = await getArticleById(articleId);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 });
  }
}
