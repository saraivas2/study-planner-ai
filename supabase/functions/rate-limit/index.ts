import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { email, action } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    if (action === "check") {
      // Check if user is blocked (3+ failed attempts in last 5 minutes)
      const { data: attempts, error } = await supabase
        .from("login_attempts")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("success", false)
        .gte("attempted_at", fiveMinutesAgo);

      if (error) {
        console.error("Error checking attempts:", error);
        return new Response(
          JSON.stringify({ blocked: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const failedAttempts = attempts?.length || 0;
      const blocked = failedAttempts >= 3;
      
      // Calculate remaining block time if blocked
      let remainingSeconds = 0;
      if (blocked && attempts && attempts.length > 0) {
        const lastAttempt = new Date(attempts[attempts.length - 1].attempted_at);
        const blockEndsAt = new Date(lastAttempt.getTime() + 5 * 60 * 1000);
        remainingSeconds = Math.max(0, Math.ceil((blockEndsAt.getTime() - Date.now()) / 1000));
      }

      return new Response(
        JSON.stringify({ 
          blocked, 
          failedAttempts, 
          remainingSeconds,
          message: blocked ? `Conta bloqueada. Tente novamente em ${Math.ceil(remainingSeconds / 60)} minuto(s).` : null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "record") {
      const { success } = await req.json().catch(() => ({ success: false }));
      
      // Record the attempt
      const { error } = await supabase
        .from("login_attempts")
        .insert({ email: normalizedEmail, success: success || false });

      if (error) {
        console.error("Error recording attempt:", error);
      }

      // If successful, clean up old failed attempts for this user
      if (success) {
        await supabase
          .from("login_attempts")
          .delete()
          .eq("email", normalizedEmail)
          .eq("success", false);
      }

      return new Response(
        JSON.stringify({ recorded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record failed attempt
    if (action === "failed") {
      const { error } = await supabase
        .from("login_attempts")
        .insert({ email: normalizedEmail, success: false });

      if (error) {
        console.error("Error recording failed attempt:", error);
      }

      // Check how many failed attempts now
      const { data: attempts } = await supabase
        .from("login_attempts")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("success", false)
        .gte("attempted_at", fiveMinutesAgo);

      const failedAttempts = attempts?.length || 0;

      return new Response(
        JSON.stringify({ 
          recorded: true, 
          failedAttempts,
          blocked: failedAttempts >= 3
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear attempts on successful login
    if (action === "success") {
      await supabase
        .from("login_attempts")
        .delete()
        .eq("email", normalizedEmail);

      return new Response(
        JSON.stringify({ cleared: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Rate limit error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
