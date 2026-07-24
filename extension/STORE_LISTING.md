# Chrome Web Store submission worksheet

## Store listing

**Name:** Strang

**Summary:** Highlight a dense passage and turn it into a short visual explanation without leaving the page.

**Category:** Education

**Detailed description:**

Strang helps students get through difficult readings without leaving the page.

Highlight a dense passage from a textbook, research paper, lecture note, or assigned reading. Open Strang from the Chrome toolbar, bring in the highlighted text, and create a short visual explanation of the concept.

With Strang you can:

- Use highlighted text or paste a passage directly
- Create a focused video explanation
- Watch the result in Chrome's side panel
- Open the completed video in a full tab or copy its link
- View your plan and billing-period usage from your Strang dashboard

New accounts include one complete trial video. Pro includes 20 videos per monthly billing period.

Support: support@thestrang.com

## Single purpose

Strang converts text explicitly selected or pasted by the user into a short educational video and displays it in Chrome's side panel.

## Permission justifications

**activeTab:** Accesses only the active tab after the user asks Strang to retrieve highlighted text.

**scripting:** Runs a small function in the active tab to read the text currently selected by the user.

**sidePanel:** Displays Strang's input, generation progress, and completed video alongside the page being read.

**storage:** Stores the user's Strang authentication session and production API endpoint locally so they can remain signed in.

**Host access (`thestrang.com` and `api.thestrang.com`):** Connects the extension to Strang account authentication and the video-generation API.

## Privacy practices

Strang handles:

- Authentication information: Strang access and refresh tokens, stored locally in Chrome
- Personal information: account email address
- Website content: only text the user highlights or pastes into Strang
- User-generated content: the passage submitted for video generation

The submitted passage is sent over HTTPS to Strang's API and to the service providers needed to create the video, currently OpenAI and HeyGen. The data is used only to authenticate the user, provide the requested video, enforce plan usage, and operate the service. It is not sold or used for personalized advertising.

Privacy policy URL: https://www.thestrang.com/privacy

## Assets still needed in the Developer Dashboard

- At least one 1280×800 or 640×400 screenshot
- A 440×280 small promotional tile
- Optional 1400×560 marquee promotional image
- Verified support email and publisher information
