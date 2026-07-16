import { fetchConfluenceApi } from "./atlassian-client.js";
import { convertAdfToTipTap } from "./adf-converter.js";

export interface ConfluencePageInfo {
  pageId: string;
  title: string;
  spaceKey: string;
  spaceName: string;
  url: string;
}

export interface ConfluenceSpace {
  key: string;
  name: string;
}

export async function resolvePage(url: string): Promise<ConfluencePageInfo> {
  // Accept various URL formats:
  // https://domain.atlassian.net/wiki/spaces/SPACE/pages/123/Title
  // https://domain.atlassian.net/wiki/spaces/SPACE/pages/123
  // Just the page ID: 123

  const pageIdMatch = url.match(/\/pages\/(\d+)/);
  const standaloneIdMatch = url.match(/^(\d+)$/);

  const pageId = pageIdMatch?.[1] ?? standaloneIdMatch?.[1];

  if (!pageId) {
    throw new Error(
      "Could not extract Confluence page ID from URL. Expected formats:\n" +
        "- https://domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Title\n" +
        "- https://domain.atlassian.net/wiki/spaces/SPACE/pages/123456\n" +
        "- 123456",
    );
  }

  const page = await fetchConfluenceApi(`/pages/${pageId}`) as {
    id: string;
    title: string;
    spaceId: string;
    _links?: { webui?: string };
  };

  // Get space name
  let spaceName = "";
  let spaceKey = "";
  try {
    const space = await fetchConfluenceApi(`/spaces/${page.spaceId}`) as {
      key?: string;
      name?: string;
    };
    spaceKey = space.key ?? "";
    spaceName = space.name ?? "";
  } catch {
    // Space lookup optional
  }

  return {
    pageId: page.id,
    title: page.title,
    spaceKey,
    spaceName,
    url: page._links?.webui ?? url,
  };
}

export async function getPageContent(pageId: string): Promise<{
  pageInfo: ConfluencePageInfo;
  tipTapJson: object;
}> {
  // Fetch page metadata
  const page = await fetchConfluenceApi(
    `/pages/${pageId}?body-format=atlas_doc_format`,
  ) as {
    id: string;
    title: string;
    spaceId: string;
    body?: {
      atlas_doc_format?: { value: string };
    };
    _links?: { webui?: string };
  };

  let spaceKey = "";
  let spaceName = "";
  try {
    const space = await fetchConfluenceApi(`/spaces/${page.spaceId}`) as {
      key?: string;
      name?: string;
    };
    spaceKey = space.key ?? "";
    spaceName = space.name ?? "";
  } catch {
    // optional
  }

  const pageInfo: ConfluencePageInfo = {
    pageId: page.id,
    title: page.title,
    spaceKey,
    spaceName,
    url: page._links?.webui ?? "",
  };

  const adfRaw = page.body?.atlas_doc_format?.value;
  if (!adfRaw) {
    // Fallback: return empty doc
    return {
      pageInfo,
      tipTapJson: { type: "doc", content: [{ type: "paragraph" }] },
    };
  }

  let adf: object;
  try {
    adf = JSON.parse(adfRaw);
  } catch {
    throw new Error("Failed to parse Confluence page content");
  }

  const tipTapJson = convertAdfToTipTap(adf);

  return { pageInfo, tipTapJson };
}
