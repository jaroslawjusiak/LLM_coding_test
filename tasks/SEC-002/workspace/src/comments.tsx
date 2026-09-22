export function toCommentHtml(text: string): string {
  return text;
}

export function CommentBody(props: { text: string }) {
  return <div dangerouslySetInnerHTML={{ __html: toCommentHtml(props.text) }} />;
}
