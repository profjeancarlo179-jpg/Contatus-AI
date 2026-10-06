<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Bio pages use owner-scoped editing and a separate public `/b/$slug` route that reads only published profile fields, so visitors never need app authentication.
- Bio avatar uploads are resized to a bounded embedded JPEG stored with the page, so public avatars do not require granting access to private client media.
- Bio appearance is stored separately from link icons, normalized against safe color and enum values, and applied through scoped CSS tokens in a shared preview/public renderer to preserve saved styling without affecting app navigation.
