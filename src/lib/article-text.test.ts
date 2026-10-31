import { articleParagraphs, pageParagraphs } from "./article-text";

test("turns HTML blocks into plain paragraphs and drops markup", () => {
  expect(
    articleParagraphs(
      "<h2>Q3</h2><p>Sales <b>rose</b>\n 5%.</p><script>alert(1)</script><ul><li><p>One</p></li></ul><p> </p>",
    ),
  ).toEqual(["Q3", "Sales rose 5%.", "One"]);
});

test("splits plain text on blank lines", () => {
  expect(articleParagraphs("First line\n\nSecond")).toEqual(["First line", "Second"]);
});

test("reads a web page's article, not its navigation", () => {
  expect(
    pageParagraphs("<nav><li>Menu</li></nav><article><h1>Title</h1><p>Body</p></article>"),
  ).toEqual(["Title", "Body"]);
});
