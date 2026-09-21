Snake Sorter Browser Helper

Purpose
-------
Imports image URLs already exposed by a MorphMarket Green Tree Python listing
that you have opened normally in Chrome. It does not download images, bypass
access controls, solve challenges, log in for you, or crawl listings.

Install
-------
1. Extract snake-sorter-browser-helper.zip to a folder.
2. In Chrome, type chrome://extensions in the address bar.
3. Turn on Developer mode.
4. Choose "Load unpacked".
5. Select the extracted snake-sorter-browser-helper folder.
6. Sign in to Snake Sorter in another tab as the owner.

Use
---
1. Open an existing MorphMarket Green Tree Python listing normally.
2. Click the Snake Sorter Browser Helper extension icon.
3. Use "Send live refs to Snake Sorter" first.
4. The helper opens Snake Sorter and attaches the exposed gallery image URLs.
   If that MorphMarket listing is not in the acquisition queue yet, Snake
   Sorter creates a new pending candidate automatically.
5. If those live refs do not render in Snake Sorter, return to the listing and
   use "Capture gallery fallback". The helper cycles the visible listing
   gallery, captures the displayed animal images locally in your browser, and
   attaches them to the same candidate for review.
6. Review the imported images in Snake Sorter.

Important
---------
- Live refs remain metadata-only references.
- Browser-local fallback captures are stored only as review media and remain
  metadata-only until separately reviewed and rights-cleared.
- They are not training media unless separately reviewed and rights-cleared.
- If MorphMarket presents an access-control or challenge page, the helper stops;
  it does not attempt to bypass it.
