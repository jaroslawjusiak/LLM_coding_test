export function toCommentHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function CommentBody(props: { text: string }) {
  return <p>{toCommentHtml(props.text)}</p>;
}
