# Guidelines:
- Do not create documentations unless explicitly asked for.
- Comments should be minimal and rare. They should only be used to expain what cannot be inferred from reading the code.
- Suggest approriate refactors after large changes are made
- Error modes and error handling should be considered as a part of implementation
- implementations should bias towars simplicity and not intruducing too much surface area for error
- format/style should be consistent with the rest of the codebase
- File/variable names should be descriptive and consistent
- do research if you are not sure about the documentation

# What we are doing
- We are building: An engine that reconstructs how any public expert actually thinks — not just what they say they value, but the full topology of their taste — and uses it to judge anything you submit.

# What I am thinking so far ,this stuff might change:
Taste is pattern recognition, not opinions. The interesting hard problem is reconstructing the pattern — not just stated values but actual reactions. Nia's oracle is uniquely suited to this because it autonomously goes deep across sources, not just skimming the surface. We show this by making the research phase visible — during taste profile building, the UI surfaces what oracle is finding and indexing in real time, so you can see it going deeper than a simple web search would.
The contradiction layer. Real experts contradict themselves. PG has praised things that violate his own essays. A system that only indexes stated opinions will be inconsistent with reality. TasteGraph explicitly models the gap between what someone says they value vs what they actually respond well to — indexing both stated principles AND documented reactions to specific things. We show this by making contradictions a first-class output — every verdict has a dedicated contradiction callout: "⚠️ Arlan says he values X but has publicly praised Y which violates that. Here's how that tension affects this verdict." It's not buried in a paragraph, it's a visible structural element.
Taste drift over time. People's taste changes. Early Arlan vs now. The system is temporally aware — it weights recent signals more heavily than old ones and can show how someone's judgment has evolved. We show this with a timeline view in the taste profile — a visual of how their expressed values have shifted over time, so the verdict isn't just a flat snapshot but a weighted synthesis that the user can see is time-aware.
The blind spot map. Every expert has categories of things they systematically misjudge. The output includes a calibration layer — "Arlan is historically wrong about X type of thing" — so you know where to discount the verdict. We show this as a warning card in every verdict: "⚡ Known blind spot: Arlan has historically underestimated consumer social apps. Apply a correction if your submission is in this category."
Taste is social. PG's taste was shaped by people he admires. Naval's worldview comes from specific philosophers and investors. TasteGraph maps the taste graph — who influenced this person, who they defer to, where their aesthetic actually came from. When you judge something you're running it against their whole intellectual lineage, not just them. Only possible with deep oracle research across sources. We show this with a visible influence graph in the taste profile — nodes of people and ideas that shaped this person, with edges showing the connection. Not decoration — it actually affects which parts of the index get weighted at judgment time.
Taste is contextual. The same person judges differently depending on stakes and framing. Arlan at a hackathon judges differently than Arlan making a YC acceptance decision. TasteGraph lets you specify the context of the judgment before you submit. We show this by making context a first-class input — a selector that changes the judgment framing and visibly shifts the verdict output when you switch between contexts. The diff is shown explicitly so you can see what changed and why.
Taste has tells. Experts signal approval and disapproval in specific linguistic patterns. PG uses certain words when genuinely excited vs being polite. Indexing enough of someone's reactions lets you calibrate confidence. We show this by surfacing the tell analysis in the verdict — "High confidence: the signals here match the linguistic patterns Arlan uses when he's genuinely excited about something" vs "Low confidence: the signals are mixed, he'd probably be on the fence." The confidence score isn't just a number — it's explained by the tells.
Taste is falsifiable. This is what separates TasteGraph from a wrapper entirely. If you've built a taste model for someone, you can test it against things they've already publicly reacted to. Did the model predict they'd like something they actually praised? That's a score you can show. A taste model with a published accuracy rate against known reactions is a research contribution, not a demo. We show this prominently — every taste profile has a published accuracy score computed against known reactions, shown right next to the person's name. The methodology is surfaced so it's not a black box number — "tested against 47 known public reactions, 81% accuracy."

What you can submit:
Not just text. URL, GitHub repo, pitch deck PDF, a tweet. Nia handles all of these natively. That makes the product feel real rather than a toy.

What you get back — the full breakdown:
What they'd love, cited against their actual words
What they'd hate, same
What they'd change
A score they'd give it
The contradiction callout — where stated values conflict with actual reactions and how that shifts the verdict
The blind spot warning — categories where their judgment is historically unreliable
The influence lineage — how their intellectual graph shapes this specific verdict
Context variance — how the verdict shifts depending on the judging context specified
Confidence score — explained by their linguistic tells, not just a number
Falsifiability accuracy score — how well the model has predicted their known past reactions, with methodology visible



