"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ShortStudentLinkPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  useEffect(() => {
    if (params.token) router.replace(`/student/${params.token}`);
  }, [params.token, router]);
  return null;
}
