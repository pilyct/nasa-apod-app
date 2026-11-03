import { describe, expect, it } from "vitest";
import {
  cleanCredit,
  cleanExplanation,
  decodeEntities,
  extractMainMedia,
  htmlToText,
} from "@/lib/apod-html";

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("Earth&rsquo;s &amp; Moon&#39;s &#x2014; ok")).toBe("Earth’s & Moon's — ok");
  });

  it("leaves unknown entities alone", () => {
    expect(decodeEntities("a &bogus; b")).toBe("a &bogus; b");
  });
});

describe("htmlToText", () => {
  it("drops tags and collapses whitespace, including non-breaking spaces", () => {
    expect(htmlToText('<b>Hi</b>  <a href="x">there</a>\n')).toBe("Hi there");
  });

  it("keeps words joined across inline tags and separates them across line breaks", () => {
    expect(htmlToText('<a href="x">Earth</a>, and Mars<br>Next')).toBe("Earth, and Mars Next");
  });

  it("removes whitespace before punctuation left by line breaks inside links", () => {
    expect(htmlToText('( <a href="x">\nTWAN\n</a> ) and <a href="y">Mars\n</a> .')).toBe("(TWAN) and Mars.");
  });
});

describe("cleanExplanation", () => {
  it("removes the Explanation label and the Tomorrow's picture teaser", () => {
    expect(
      cleanExplanation(
        "<strong>Explanation: </strong>A comet.<br><br><strong>Tomorrow's picture: </strong>a hidden gem",
      ),
    ).toBe("A comet.");
  });

  it("removes other footers that follow a double line break and a bold label", () => {
    expect(
      cleanExplanation(
        'A star.<br /><br /><b> Almost Hyperspace: </b> <a href="https://apod.nasa.gov/apod/random_apod.html">Random APOD Generator</a> <br />',
      ),
    ).toBe("A star.");
    expect(
      cleanExplanation("Pluto.<br /><br /><b>APOD Public Talk:</b> Feb. 21, Columbia, MD <br />"),
    ).toBe("Pluto.");
  });

  it("keeps explanations that have no footer intact", () => {
    expect(cleanExplanation("Line one.<br>Line two.")).toBe("Line one. Line two.");
  });
});

describe("cleanCredit", () => {
  it.each([
    ['<a href="x">Eddy Metais</a>', "Eddy Metais"],
    ["<b> Credit: </b> NASA", "NASA"],
    ["<b>Image Credit &amp; Copyright:</b> Jane Doe", "Jane Doe"],
    ["<b> Video Credit &amp; Copyright: </b> Jeff Dai", "Jeff Dai"],
    ["<b> Images Credit &amp; Copyright: </b> Victor Sabet &amp; Julien De Winter", "Victor Sabet & Julien De Winter"],
    ["<b> Video Illustration Credit: </b> DESY", "DESY"],
    ["<b> Digital Reproduction Credit: </b> A. Person", "A. Person"],
    ["<b>Copyright:</b> Jane Doe", "Jane Doe"],
  ])("cleans %s", (input, expected) => {
    expect(cleanCredit(input)).toBe(expected);
  });

  it("returns undefined for empty credits", () => {
    expect(cleanCredit("")).toBeUndefined();
    expect(cleanCredit(undefined)).toBeUndefined();
  });
});

describe("extractMainMedia", () => {
  const page = (media: string) =>
    `<html><head><title>x</title></head><body><center><h1>APOD</h1>
<p><a href="https://science.nasa.gov/apod/archive/">Discover the cosmos!</a>
<p> 2026 November 3<br> ${media} </center><center><b>Title</b></center>
<p>Explanation: <a href="https://example.com/cat.jpg"><img src="https://example.com/cat.jpg"></a></body></html>`;

  it("finds the main image and the link to its full-size file", () => {
    expect(extractMainMedia(page('<a href="https://a/full.jpg"><IMG SRC="https://a/small.jpg"></a>'))).toEqual({
      kind: "image",
      src: "https://a/small.jpg",
      href: "https://a/full.jpg",
    });
  });

  it("does not take the archive link as the image's link", () => {
    expect(extractMainMedia(page('<img src="https://a/x.jpg">'))).toEqual({
      kind: "image",
      src: "https://a/x.jpg",
      href: undefined,
    });
  });

  it("resolves protocol-relative iframe sources", () => {
    expect(extractMainMedia(page('<iframe src="//www.youtube.com/embed/abc?rel=0"></iframe>'))).toEqual({
      kind: "embed",
      src: "https://www.youtube.com/embed/abc?rel=0",
    });
  });

  it("finds a self-hosted video file", () => {
    expect(extractMainMedia(page('<video controls><source src="https://a/v.mp4" type="video/mp4"></video>'))).toEqual({
      kind: "videoFile",
      src: "https://a/v.mp4",
    });
  });

  it("never returns media that only appears in the explanation", () => {
    expect(extractMainMedia(page(""))).toBeUndefined();
  });
});
