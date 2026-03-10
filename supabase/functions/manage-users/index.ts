// deno-lint-ignore-file
// @ts-nocheck — This file runs in the Supabase Deno Edge Runtime, not in the Vite/Node.js build.
// The IDE errors (Deno, esm.sh imports) are expected and do not affect deployment.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify the calling user is authenticated and has permission
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'غير مصرح' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create admin client with service_role key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Create user client to verify the caller's identity
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: { headers: { Authorization: authHeader } },
                auth: { autoRefreshToken: false, persistSession: false },
            }
        )

        // Get the calling user
        const { data: { user: callingUser }, error: authError } = await supabaseUser.auth.getUser()
        if (authError || !callingUser) {
            return new Response(
                JSON.stringify({ error: 'غير مصرح - جلسة غير صالحة' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const body = await req.json()
        const { action } = body

        // =============== Permission Check ===============
        // Determine required permission based on action
        let requiredPermission = 'auth.users.create'
        if (action === 'update') requiredPermission = 'auth.users.update'
        else if (action === 'list') requiredPermission = 'auth.users.read'
        else if (action === 'delete') requiredPermission = 'auth.users.delete'

        const { data: hasPermission } = await supabaseAdmin.rpc('check_permission', {
            p_user_id: callingUser.id,
            p_permission: requiredPermission,
        })

        if (!hasPermission) {
            return new Response(
                JSON.stringify({ error: 'ليس لديك صلاحية لإدارة المستخدمين' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // =============== CREATE USER ===============
        if (action === 'create') {
            const { email, password, full_name, phone, role_id } = body

            if (!email || !password || !full_name) {
                return new Response(
                    JSON.stringify({ error: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبون' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return new Response(
                    JSON.stringify({ error: 'صيغة البريد الإلكتروني غير صحيحة' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Validate password length
            if (password.length < 6) {
                return new Response(
                    JSON.stringify({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Create auth user
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name },
            })

            if (createError) {
                return new Response(
                    JSON.stringify({ error: createError.message }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // The fn_handle_new_user trigger auto-creates the profile,
            // but we need to wait briefly for the trigger to execute,
            // then update with phone if provided. 
            if (newUser.user && (phone || full_name)) {
                const profileUpdates: Record<string, unknown> = {}
                if (phone) profileUpdates.phone = phone
                if (full_name) profileUpdates.full_name = full_name

                await supabaseAdmin
                    .from('profiles')
                    .update(profileUpdates)
                    .eq('id', newUser.user.id)
            }

            // Assign role if provided
            if (role_id && newUser.user) {
                // Validate role exists
                const { data: roleExists } = await supabaseAdmin
                    .from('roles')
                    .select('id')
                    .eq('id', role_id)
                    .single()

                if (roleExists) {
                    await supabaseAdmin
                        .from('user_roles')
                        .insert({
                            user_id: newUser.user.id,
                            role_id,
                            assigned_by: callingUser.id,
                        })
                }
            }

            return new Response(
                JSON.stringify({ user: newUser.user }),
                { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // =============== UPDATE USER ===============
        if (action === 'update') {
            const { user_id, email, password, is_active, full_name, phone } = body

            if (!user_id) {
                return new Response(
                    JSON.stringify({ error: 'معرف المستخدم مطلوب' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Prevent self-deactivation
            if (is_active === false && user_id === callingUser.id) {
                return new Response(
                    JSON.stringify({ error: 'لا يمكنك تعطيل حسابك الخاص' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Update auth user (email/password)
            const authUpdates: Record<string, unknown> = {}
            if (email) authUpdates.email = email
            if (password) authUpdates.password = password

            if (Object.keys(authUpdates).length > 0) {
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    user_id,
                    authUpdates
                )
                if (updateError) {
                    return new Response(
                        JSON.stringify({ error: updateError.message }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }
            }

            // Update profile
            const profileUpdates: Record<string, unknown> = {}
            if (full_name !== undefined) profileUpdates.full_name = full_name
            if (phone !== undefined) profileUpdates.phone = phone
            if (is_active !== undefined) profileUpdates.is_active = is_active

            if (Object.keys(profileUpdates).length > 0) {
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .update(profileUpdates)
                    .eq('id', user_id)

                if (profileError) {
                    return new Response(
                        JSON.stringify({ error: profileError.message }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }
            }

            return new Response(
                JSON.stringify({ user: { id: user_id, ...profileUpdates } }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // =============== LIST USERS ===============
        if (action === 'list') {
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

            if (listError) {
                return new Response(
                    JSON.stringify({ error: listError.message }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({ users }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // =============== DELETE USER ===============
        if (action === 'delete') {
            const { user_id } = body

            if (!user_id) {
                return new Response(
                    JSON.stringify({ error: 'معرف المستخدم مطلوب' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Prevent self-deletion
            if (user_id === callingUser.id) {
                return new Response(
                    JSON.stringify({ error: 'لا يمكنك حذف حسابك الخاص' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
            if (deleteError) {
                return new Response(
                    JSON.stringify({ error: deleteError.message }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: 'إجراء غير معروف. الإجراءات المتاحة: create, update, list, delete' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
