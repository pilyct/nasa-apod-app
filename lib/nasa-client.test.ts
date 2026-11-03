import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchApod,
  ApodNotFoundError,
  ApodRateLimitedError,
  ApodUpstreamError,
} from "@/lib/nasa-client";

describe("fetchApod (MOCK_APOD=true)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns a fixture without making a network call", async () => {
    vi.stubEnv("MOCK_APOD", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.date).toBe("2024-01-01");
    expect(apod.title).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is deterministic for the same date", async () => {
    vi.stubEnv("MOCK_APOD", "true");

    const first = await fetchApod("2024-05-05", 60);
    const second = await fetchApod("2024-05-05", 60);

    expect(first).toEqual(second);
  });
});

// Builds a page shaped like NASA's `basic_html`: the classic APOD template,
// with the day's media in the first <center> block.
function basicHtml(media: string, rest = "") {
  return `<!doctype html><html><head><title> APOD </title></head>
<body BGCOLOR="#F4F4FF"><center><h1> Astronomy Picture of the Day </h1>
<p><a href="https://science.nasa.gov/apod/archive/">Discover the cosmos!</a> Each day ...
<p> 2026 November 3<br> ${media} </center>
<center><b> Title </b></center><p><b> Explanation: </b> ${rest}</body></html>`;
}

const THUMBNAIL =
  "https://assets.science.nasa.gov/dynamicimage/assets/science/astro/programs/cosmic-origins/images/misc/news-thumbnail.png?w=594&h=516";
const LOGO =
  "https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png";
const COMET =
  "https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/november/CometMeteor_Metais_1934.jpg";

const baseEntry = {
  date: "2026-11-03",
  title: "Comet PanSTARRs and Rainbow Meteor",
  media_type: "image",
  explanation: "<strong>Explanation: </strong>Did this meteor come from that comet?",
  url: "https://science.nasa.gov/image-article/apod-2026-november-3-comet-panstarrs-and-rainbow-meteor/",
};

function stubFetch(body: unknown, init: ResponseInit = { status: 200 }) {
  vi.stubEnv("MOCK_APOD", "false");
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(body), init));
}

describe("fetchApod against the science.nasa.gov APOD API", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("requests the YYMMDD path without any API key", async () => {
    const fetchSpy = stubFetch({
      ...baseEntry,
      basic_html: basicHtml(`<a href="${COMET}"><IMG SRC="${COMET}" alt="A comet"></a>`),
    });

    await fetchApod("2026-11-03", 60);

    const requested = String(fetchSpy.mock.calls[0][0]);
    expect(requested).toBe("https://science.nasa.gov/wp-json/wp/v2/apod-basic/261103");
    expect(requested).not.toContain("api_key");
  });

  it("maps a current image entry, cleaning the HTML out of text fields", async () => {
    stubFetch({
      ...baseEntry,
      explanation:
        "<strong>Explanation: </strong>Did this <a href=\"https://x\">meteor</a> come from Earth&rsquo;s sky?<br><br><strong>Tomorrow's picture: </strong>a hidden gem",
      credit: '<a href="https://www.instagram.com/eddy_metais_photo/">Eddy Metais</a>',
      copyright: '<a href="https://www.instagram.com/eddy_metais_photo/">Eddy Metais</a>',
      hdurl: `${COMET}?w=0&h=0&fit=clip`,
      basic_html: basicHtml(`<a href="${COMET}"><IMG SRC="${COMET}" alt="A comet"></a>`),
    });

    const apod = await fetchApod("2026-11-03", 60);

    expect(apod).toEqual({
      title: "Comet PanSTARRs and Rainbow Meteor",
      date: "2026-11-03",
      explanation: "Did this meteor come from Earth’s sky?",
      copyright: "Eddy Metais",
      mediaType: "image",
      imageUrl: COMET,
      hdImageUrl: COMET,
    });
  });

  it("uses the image from the page when hdurl is NASA's generic thumbnail (1995 entries)", async () => {
    const gif = "https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/1995/june/e_lens.gif";
    stubFetch({
      ...baseEntry,
      date: "1995-06-16",
      title: "Neutron Star Earth",
      credit: "",
      copyright: "",
      hdurl: THUMBNAIL,
      basic_html: basicHtml(`<a href="${gif}"> <IMG SRC="${gif}" alt="See Explanation."></a>`),
    });

    const apod = await fetchApod("1995-06-16", 60);

    expect(apod.imageUrl).toBe(gif);
    expect(apod.copyright).toBeUndefined();
  });

  it("ignores images that are only linked from the explanation", async () => {
    stubFetch({
      ...baseEntry,
      basic_html: basicHtml(
        `<IMG SRC="${COMET}">`,
        `<a href="https://example.com/cat.jpg"><img src="https://example.com/cat.jpg"></a>`,
      ),
    });

    const apod = await fetchApod("2026-11-03", 60);

    expect(apod.imageUrl).toBe(COMET);
  });

  it("strips the credit label from older credit lines", async () => {
    stubFetch({
      ...baseEntry,
      credit:
        '<b>Illustration Credit &amp; <a href="https://apod.nasa.gov/apod/lib/about_apod.html#srapply">Copyright</a>: </b><a href="https://x">Lynette Cook</a>',
      basic_html: basicHtml(`<IMG SRC="${COMET}">`),
    });

    const apod = await fetchApod("2026-11-03", 60);

    expect(apod.copyright).toBe("Lynette Cook");
  });

  it("maps a YouTube video, resolving its protocol-relative embed URL", async () => {
    stubFetch({
      ...baseEntry,
      media_type: "video",
      hdurl: THUMBNAIL,
      basic_html: basicHtml(
        `<iframe width="960" height="540" src="//www.youtube.com/embed/1R5QqhPq1Ik?rel=0" frameborder="0" allowfullscreen></iframe>`,
      ),
    });

    const apod = await fetchApod("2024-06-30", 60);

    expect(apod.mediaType).toBe("video");
    expect(apod.videoEmbedUrl).toBe("https://www.youtube.com/embed/1R5QqhPq1Ik?rel=0");
    expect(apod.videoFileUrl).toBeUndefined();
  });

  it("maps a NASA-hosted video file", async () => {
    const mp4 = "https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2026/october/occultation.mp4";
    stubFetch({
      ...baseEntry,
      media_type: "video",
      basic_html: basicHtml(`<video controls autoplay loop><source src="${mp4}" type="video/mp4"></video>`),
    });

    const apod = await fetchApod("2026-10-28", 60);

    expect(apod.videoFileUrl).toBe(mp4);
    expect(apod.videoEmbedUrl).toBeUndefined();
  });

  it("maps a 404 to ApodNotFoundError", async () => {
    stubFetch(
      { code: "apod_basic_not_found", message: "APOD not found.", data: { status: 404 } },
      { status: 404 },
    );

    await expect(fetchApod("1995-06-17", 60)).rejects.toBeInstanceOf(ApodNotFoundError);
  });

  it("maps a 429 to ApodRateLimitedError with NASA's Retry-After", async () => {
    stubFetch({}, { status: 429, headers: { "Retry-After": "30" } });

    const error = await fetchApod("2026-11-03", 60).catch((e) => e);

    expect(error).toBeInstanceOf(ApodRateLimitedError);
    expect(error.retryAfterSeconds).toBe(30);
  });

  it("maps a 500 to ApodUpstreamError", async () => {
    stubFetch({}, { status: 500 });

    await expect(fetchApod("2026-11-03", 60)).rejects.toBeInstanceOf(ApodUpstreamError);
  });
});

// Exercises the sanitization this codebase relies on to stop an unexpected
// (or malicious) upstream NASA response from reaching the UI as-is — this is
// the one place raw NASA JSON is first parsed, so a regression here would
// silently remove the app's only XSS/host-allowlist boundary.
describe("fetchApod URL/host sanitization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("never uses a javascript: image url", async () => {
    stubFetch({
      ...baseEntry,
      basic_html: basicHtml(`<a href="javascript:alert(1)"><img src="javascript:alert(1)"></a>`),
    });

    await expect(fetchApod("2026-11-03", 60)).rejects.toBeInstanceOf(ApodUpstreamError);
  });

  it("falls back hdImageUrl to the image when the link is unsafe", async () => {
    stubFetch({
      ...baseEntry,
      basic_html: basicHtml(`<a href="javascript:alert(1)"><img src="${COMET}"></a>`),
    });

    const apod = await fetchApod("2026-11-03", 60);

    expect(apod.imageUrl).toBe(COMET);
    expect(apod.hdImageUrl).toBe(COMET);
  });

  it("rejects a non-allowlisted video embed host", async () => {
    stubFetch({
      ...baseEntry,
      media_type: "video",
      basic_html: basicHtml(`<iframe src="https://evil.example.com/embed/abc123"></iframe>`),
    });

    const apod = await fetchApod("2026-11-03", 60);

    expect(apod.videoEmbedUrl).toBeUndefined();
    expect(apod.videoFileUrl).toBeUndefined();
  });

  it("rejects a video file url on a disallowed host even with an allowed extension", async () => {
    stubFetch({
      ...baseEntry,
      media_type: "video",
      basic_html: basicHtml(`<video src="https://evil.example.com/sample.mp4"></video>`),
    });

    const apod = await fetchApod("2026-11-03", 60);

    expect(apod.videoFileUrl).toBeUndefined();
    expect(apod.videoEmbedUrl).toBeUndefined();
  });
});

// NASA sometimes returns its generic artwork (the site logo, or a "news
// thumbnail") instead of the real picture. That must surface as an upstream
// error so it is never shown or cached as the day's picture.
describe("fetchApod placeholder detection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects an entry whose only image is the generic thumbnail", async () => {
    stubFetch({ ...baseEntry, hdurl: THUMBNAIL, basic_html: basicHtml("") });

    await expect(fetchApod("2026-11-03", 60)).rejects.toBeInstanceOf(ApodUpstreamError);
  });

  it("rejects the NASA logo as the image", async () => {
    stubFetch({ ...baseEntry, hdurl: LOGO, basic_html: basicHtml(`<img src="${LOGO}">`) });

    await expect(fetchApod("2026-11-03", 60)).rejects.toBeInstanceOf(ApodUpstreamError);
  });

  it("falls back to hdurl when the page has no image but hdurl is real", async () => {
    stubFetch({ ...baseEntry, hdurl: COMET, basic_html: basicHtml("") });

    const apod = await fetchApod("2026-11-03", 60);

    expect(apod.imageUrl).toBe(COMET);
  });
});
