import type { GeneratedPage, TestDetailPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import type { IntentMethod } from "../../types/docspec.js";

export interface TestDetailPageOptions {
  className: string;
  methods: IntentMethod[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateTestDetailPage(options: TestDetailPageOptions): GeneratedPage {
  const { className, methods, artifactLabel, artifactColor } = options;

  const data: TestDetailPageData = {
    type: PageType.TEST_DETAIL,
    className,
    methods,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.TEST_DETAIL,
    slug: `${artifactLabel}/tests/${className.toLowerCase()}`,
    title: `Test Detail: ${className}`,
    description: `${methods.length} methods with intent signals`,
    artifactLabel,
    artifactColor,
    data,
  };
}
