interface Env {
  DB?: any;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (context.env.DB) {
      const { results } = await context.env.DB.prepare(
        "SELECT * FROM exam_results ORDER BY created_at DESC"
      ).all();

      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Failed to fetch results" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
