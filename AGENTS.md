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

- Keep progress calculations and badge eligibility in pure helpers in `src/lib/rise.ts` so all pages share the same rules and tests.
- Version browser entry storage separately from legacy demo storage; migrate by removing the legacy key once and never seed entries.
- Keep one local clock in StoreProvider and refresh it at midnight and on focus so all progress views use the same local day.
- Keep StoreProvider outside keyed page transitions so navigation never reloads or discards pending entries.
- Validate browser entries at the storage boundary and report failed saves instead of crashing or pretending persistence succeeded.
