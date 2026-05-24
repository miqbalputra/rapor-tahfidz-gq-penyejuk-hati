import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({
  teacherId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
});

const updateSchema = z.object({
  profileId: z.string().uuid(),
  isActive: z.boolean().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
}).refine((value) => value.isActive !== undefined || Boolean(value.email) || Boolean(value.password), {
  message: "Tidak ada perubahan akun yang dikirim.",
});

type AdminUpdateAttributes = {
  email?: string;
  password?: string;
  email_confirm?: boolean;
  user_metadata?: Record<string, string>;
};

export async function GET(request: Request) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return auth.error;
  }

  const [{ data: profiles, error: profileError }, { data: users, error: usersError }] = await Promise.all([
    auth.supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, teacher_id, is_active")
      .eq("role", "guru")
      .order("full_name"),
    auth.supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (profileError || usersError) {
    return NextResponse.json({ message: profileError?.message ?? usersError?.message ?? "Gagal memuat akun guru." }, { status: 400 });
  }

  const emailByUserId = new Map((users.users ?? []).map((user) => [user.id, user.email ?? ""]));
  const accounts = (profiles ?? []).map((profile) => ({
    ...profile,
    email: emailByUserId.get(profile.id) ?? "",
  }));

  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return auth.error;
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Data akun guru belum lengkap atau password kurang dari 8 karakter." }, { status: 400 });
  }

  const { teacherId, email, password } = parsed.data;
  const { supabaseAdmin } = auth;

  const { data: teacher, error: teacherError } = await supabaseAdmin
    .from("teachers")
    .select("id, full_name, title, is_active")
    .eq("id", teacherId)
    .single();

  if (teacherError || !teacher) {
    return NextResponse.json({ message: "Data guru tidak ditemukan." }, { status: 404 });
  }

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json({ message: "Guru ini sudah punya akun. Gunakan aktif/nonaktif untuk mengelola aksesnya." }, { status: 409 });
  }

  const fullName = `${teacher.title ?? ""} ${teacher.full_name}`.trim();
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      teacher_id: teacherId,
    },
  });

  if (createError || !created.user) {
    return NextResponse.json({ message: createError?.message ?? "Gagal membuat user Supabase Auth." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: created.user.id,
      full_name: fullName,
      role: "guru",
      teacher_id: teacherId,
      is_active: true,
    })
    .select("id, full_name, role, teacher_id, is_active")
    .single();

  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 400 });
  }

  await supabaseAdmin.from("teachers").update({ email }).eq("id", teacherId);

  return NextResponse.json({ profile, email: created.user.email });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return auth.error;
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Data perubahan akun tidak valid." }, { status: 400 });
  }

  const { data: profile, error } = await auth.supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, teacher_id, is_active")
    .eq("id", parsed.data.profileId)
    .eq("role", "guru")
    .single();

  if (error || !profile) {
    return NextResponse.json({ message: error?.message ?? "Profil akun guru tidak ditemukan." }, { status: 400 });
  }

  const authAttributes: AdminUpdateAttributes = {};
  const trimmedEmail = parsed.data.email?.trim();

  if (trimmedEmail) {
    authAttributes.email = trimmedEmail;
    authAttributes.email_confirm = true;
  }

  if (parsed.data.password) {
    authAttributes.password = parsed.data.password;
  }

  if (trimmedEmail || parsed.data.password) {
    authAttributes.user_metadata = {
      full_name: profile.full_name,
      teacher_id: profile.teacher_id ?? "",
    };

    const { error: authError } = await auth.supabaseAdmin.auth.admin.updateUserById(profile.id, authAttributes);

    if (authError) {
      return NextResponse.json({ message: authError.message }, { status: 400 });
    }
  }

  let updatedProfile = profile;

  if (parsed.data.isActive !== undefined) {
    const { data: activeProfile, error: activeError } = await auth.supabaseAdmin
      .from("profiles")
      .update({ is_active: parsed.data.isActive })
      .eq("id", parsed.data.profileId)
      .eq("role", "guru")
      .select("id, full_name, role, teacher_id, is_active")
      .single();

    if (activeError) {
      return NextResponse.json({ message: activeError.message }, { status: 400 });
    }

    updatedProfile = activeProfile;
  }

  if (trimmedEmail && updatedProfile.teacher_id) {
    await auth.supabaseAdmin.from("teachers").update({ email: trimmedEmail }).eq("id", updatedProfile.teacher_id);
  }

  return NextResponse.json({ profile: updatedProfile, email: trimmedEmail });
}

async function requireAdmin(request: Request) {
  const supabaseAdmin = createSupabaseAdminClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseAdmin || !supabaseUrl || !supabaseAnonKey) {
    return { error: NextResponse.json({ message: "Konfigurasi Supabase server belum lengkap." }, { status: 500 }) };
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return { error: NextResponse.json({ message: "Session login tidak ditemukan." }, { status: 401 }) };
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser(token);

  if (userError || !user) {
    return { error: NextResponse.json({ message: "Session login tidak valid." }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin" || !profile.is_active) {
    return { error: NextResponse.json({ message: "Hanya admin aktif yang boleh mengelola akun guru." }, { status: 403 }) };
  }

  return { supabaseAdmin, user };
}
