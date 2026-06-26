interface Env {
  DB?: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data: any = await context.request.json();
    const { name, className, caseNumber, scores, summary, tops, tips, finalGrade } = data;

    // Check if D1 database binding is configured
    if (context.env.DB) {
      // D1 API is very similar to better-sqlite3
      const stmt = context.env.DB.prepare(`
        INSERT INTO exam_results (student_name, student_class, case_number, scores, summary, tops, tips, final_grade)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      await stmt.bind(
        name,
        className,
        caseNumber,
        JSON.stringify(scores),
        summary,
        JSON.stringify(tops),
        JSON.stringify(tips),
        finalGrade
      ).run();

      return new Response(JSON.stringify({ success: true, database: "D1" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Fallback if D1 is not bound (serverless local mock)
    return new Response(JSON.stringify({ 
      success: true, 
      warning: "No D1 database bound. Result received successfully but not persisted to a cloud database." 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Failed to save result" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
