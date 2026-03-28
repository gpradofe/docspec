import React from "react";
import type { GuidePageData } from "@docspec/core";

interface GuidePageProps {
  data: GuidePageData;
}

export function GuidePage({ data }: GuidePageProps) {
  return (
    <article className="prose prose-slate max-w-none">
      <div dangerouslySetInnerHTML={{ __html: data.content }} />
    </article>
  );
}
