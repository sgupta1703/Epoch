import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const POSTS = [
  {
    id: 1,
    slug: 'conversation-learning',
    category: 'Pedagogy',
    date: 'January 15, 2026',
    readTime: '5 min read',
    title: 'Why Students Learn History Better Through Conversation',
    excerpt:
      'Traditional history education asks students to absorb and recall. We asked what if they could argue back? The results surprised even us.',
    author: 'Epoch Team',
    featured: true,
    body: `When a student asks George Washington why he trusted Alexander Hamilton despite their differences, something remarkable happens. They're not reciting a textbook passage. They're thinking historically — weighing evidence, making inferences, forming their own understanding.

This is the core hypothesis behind Epoch: that conversation is a fundamentally superior learning modality for history.

## The Problem with Traditional Reading

History textbooks are written to be comprehensive, which means they're written to be passive. A student reads that the Continental Army suffered terribly at Valley Forge. They note it. They move on. Later, they recall the word "Valley Forge" and associate it with "suffering." That's it.

The actual experience — the desperation of men going barefoot in snow, Washington's doubt about whether the cause could survive the winter, the ideological arguments that kept soldiers there when common sense said leave — none of that survives the textbook's prose.

## What Changes With Conversation

When a student talks to an AI version of Washington about Valley Forge, they can ask *why*. They can push back. They can ask follow-up questions that aren't in the textbook. They have to think about what they already know in order to formulate the next question.

This is active retrieval. It's also contextualised reasoning. The research on both is unambiguous: they produce dramatically stronger retention and understanding than passive reading.

## What the Data Shows

After analysing 10,000+ conversations on Epoch, the pattern is clear: students who engage in multi-turn conversations with historical personas score significantly higher on comprehension questions — not just recall questions — than students who only read the same material.

More interestingly, the gains are largest for the *hardest* questions: source analysis, causation, and historical significance. Exactly the areas where history education has the most room for improvement.

## The Role of the Teacher

Epoch doesn't replace teacher instruction. It transforms what teachers do with their time. Rather than explaining what happened, teachers can focus on *why it matters* — the analytical layer that no AI can fully replicate.

The data also gives teachers something they've never had before: a window into individual student thinking. Not just quiz scores, but how students reason, what they assume, what they miss. That's a fundamentally different kind of classroom.`,
  },
  {
    id: 2,
    slug: 'primary-sources-ai-era',
    category: 'AI & Education',
    date: 'February 3, 2026',
    readTime: '4 min read',
    title: 'The Case for Primary Sources in the AI Era',
    excerpt:
      "AI makes it easy to generate plausible-sounding history. The antidote isn't less AI — it's grounding AI in sources that can't be fabricated.",
    author: 'Epoch Team',
    featured: false,
    body: `One of the legitimate concerns about AI in education is hallucination — AI systems confidently stating things that aren't true. In history, where dates, names, and causation matter, this is a real problem.

Epoch's approach: ground everything in primary sources.

## Why Primary Sources?

Primary sources are the bedrock of historical knowledge. They can be verified. They can be cited. They give students a direct connection to the past that secondary sources, however well-written, can't replicate.

When Epoch's AI personas speak, they speak from a framework built on primary source materials: letters, speeches, diaries, official records. This dramatically reduces hallucination while also teaching students what good historical reasoning looks like.

## Sourcing as Pedagogy

There's a second benefit: when students interact with source-grounded AI, they learn implicitly what historical argument looks like. They see claims backed by evidence. They see uncertainty acknowledged. They see the difference between what was said and what can be inferred.

This is source analysis — arguably the most important historical thinking skill — modelled in every conversation.

## What This Means for Teachers

Teachers can assign conversations with confidence that the AI won't invent facts. They can also use the conversation logs to see whether students are asking source-analysis questions or just asking for answers.

The goal isn't to make history easier. It's to make thinking visible.`,
  },
  {
    id: 3,
    slug: '10000-conversations',
    category: 'Research',
    date: 'March 1, 2026',
    readTime: '7 min read',
    title: 'What 10,000 Conversations Taught Us About History Education',
    excerpt:
      'After analysing a year of student–AI conversations, we found patterns that challenge conventional assumptions about how students engage with history.',
    author: 'Epoch Team',
    featured: false,
    body: `We analysed over 10,000 student conversations on Epoch over the past year. Here's what surprised us.

## Students ask better questions than we expected

The most common fear about AI in education is that students will use it to shortcut their way to answers. Instead, we found that students — when given an AI that responds *in character* rather than as a search engine — actually ask more sophisticated questions over time.

The shift is measurable: in the first conversation of a unit, the average student asks 2.1 questions that could be answered by a simple web search. By the third conversation, that drops to 0.8.

## The questions that mark real learning

We categorised questions into five types:

1. **Recall** — "When did X happen?"
2. **Comprehension** — "What did X mean?"
3. **Application** — "How did X affect Y?"
4. **Analysis** — "Why did you choose X over Y?"
5. **Evaluation** — "Do you think X was justified?"

Students start overwhelmingly in categories 1 and 2. High-performing students reach categories 4 and 5. The AI's responses directly shape which category students gravitate toward — responses that model analytical thinking produce more analytical follow-up questions.

## What teachers see that students don't

Teachers who use Epoch's analytics consistently report the same insight: the student who seems disengaged in class often has the most sophisticated conversations in the app. Written expression correlates with grades. Spoken participation doesn't.

Epoch surfaces the second type of student. The quiet thinker. The one who needs a different invitation to demonstrate their understanding.

## The implication for curriculum design

The most impactful units weren't the ones with the most content. They were the ones where the persona was most clearly defined and the learning objectives were most specific.

Students don't need more information. They need better constraints. The best conversations happen when students know exactly what they're trying to understand.`,
  },
  {
    id: 4,
    slug: 'introducing-mr-curator',
    category: 'Product',
    date: 'March 20, 2026',
    readTime: '3 min read',
    title: 'Introducing Mr. Curator: Your AI Teaching Assistant',
    excerpt:
      'Building a unit used to take hours. With Mr. Curator, it takes minutes — and the result is better.',
    author: 'Epoch Team',
    featured: false,
    body: `We built Mr. Curator because we kept hearing the same thing from teachers: *"I love the idea, but I don't have time to set it up."*

Setting up a great Epoch unit requires decisions. Which historical figures? What's the learning objective? How many questions on the quiz? What's the assignment asking for? These are all good decisions, but they take time — and time is the one thing teachers reliably don't have.

Mr. Curator changes the equation.

## What Mr. Curator Can Do

Tell Mr. Curator what you want to teach. He'll propose a unit structure, suggest appropriate historical personas, draft quiz questions, and configure the assignment — all based on your objectives.

You review. You adjust. You publish.

The whole process takes minutes instead of hours, and because Mr. Curator is aware of what's already in your course, he won't duplicate content or create gaps.

## The Design Philosophy

We didn't want to build a tool that did everything for teachers. We wanted to build a tool that cleared away the mechanical work so teachers could focus on the pedagogical decisions only they can make.

Mr. Curator suggests. Teachers decide. That distinction matters — it's what keeps the classroom the teacher's classroom, not the AI's.

## What's Next

We're continuing to expand Mr. Curator's capabilities based on teacher feedback. Coming soon: the ability to assign and schedule units from conversation, import curriculum standards directly, and generate differentiated content for varied learners.

If you haven't tried Mr. Curator yet, it's available to all Epoch teachers today.`,
  },
];

const CATEGORY_COLORS = {
  'Pedagogy':      { bg: 'rgba(192,80,31,.1)',  text: '#c0501f', border: 'rgba(192,80,31,.25)' },
  'AI & Education':{ bg: 'rgba(99,102,241,.1)', text: '#6366f1', border: 'rgba(99,102,241,.25)' },
  'Research':      { bg: 'rgba(20,184,166,.1)', text: '#0d9488', border: 'rgba(20,184,166,.25)' },
  'Product':       { bg: 'rgba(234,179,8,.1)',  text: '#ca8a04', border: 'rgba(234,179,8,.25)'  },
};

function PostDetail({ post, onBack }) {
  const catColor = CATEGORY_COLORS[post.category] || CATEGORY_COLORS['Pedagogy'];
  return (
    <div className="ep-blog-root">
      <nav className="ep-blog-nav">
        <button className="ep-blog-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
          Back to Journal
        </button>
        <div className="ep-blog-brand">Epoch<span>.</span></div>
        <div style={{ width: 120 }} />
      </nav>

      <article className="ep-blog-article">
        <header className="ep-blog-article-head">
          <span
            className="ep-blog-cat-badge"
            style={{ background: catColor.bg, color: catColor.text, borderColor: catColor.border }}
          >
            {post.category}
          </span>
          <h1 className="ep-blog-article-title">{post.title}</h1>
          <div className="ep-blog-article-meta">
            <span>{post.author}</span>
            <span className="ep-blog-meta-dot">·</span>
            <span>{post.date}</span>
            <span className="ep-blog-meta-dot">·</span>
            <span>{post.readTime}</span>
          </div>
        </header>

        <div className="ep-blog-article-body">
          <ReactMarkdown>{post.body}</ReactMarkdown>
        </div>

        <div className="ep-blog-article-foot">
          <button className="ep-blog-back-btn ep-blog-back-btn--foot" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
            Back to all posts
          </button>
        </div>
      </article>
    </div>
  );
}

export default function Blog() {
  const navigate = useNavigate();
  const [activePost, setActivePost] = useState(null);

  const featured = POSTS.find(p => p.featured);
  const rest = POSTS.filter(p => !p.featured);

  if (activePost) {
    return (
      <>
        <BlogStyles />
        <PostDetail post={activePost} onBack={() => setActivePost(null)} />
      </>
    );
  }

  return (
    <div className="ep-blog-root">
      <BlogStyles />

      {/* NAV */}
      <nav className="ep-blog-nav">
        <button className="ep-blog-back-btn" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
          Epoch
        </button>
        <div className="ep-blog-brand">Epoch<span>.</span></div>
        <button className="ep-blog-nav-cta" onClick={() => navigate('/register')}>Get Started</button>
      </nav>

      {/* HERO */}
      <div className="ep-blog-hero">
        <div className="ep-blog-hero-inner">
          <div className="ep-blog-hero-eyebrow">The Epoch Journal</div>
          <h1 className="ep-blog-hero-h1">
            Ideas for the<br />
            <em>modern history teacher.</em>
          </h1>
          <p className="ep-blog-hero-sub">
            Pedagogy, research, and product thinking from the team at Epoch.
          </p>
        </div>
      </div>

      {/* FEATURED */}
      {featured && (() => {
        const catColor = CATEGORY_COLORS[featured.category];
        return (
          <div className="ep-blog-wrap ep-blog-featured-wrap">
            <div className="ep-blog-featured" onClick={() => setActivePost(featured)}>
              <div className="ep-blog-feat-content">
                <span
                  className="ep-blog-cat-badge"
                  style={{ background: catColor.bg, color: catColor.text, borderColor: catColor.border }}
                >
                  {featured.category}
                </span>
                <h2 className="ep-blog-feat-title">{featured.title}</h2>
                <p className="ep-blog-feat-excerpt">{featured.excerpt}</p>
                <div className="ep-blog-feat-foot">
                  <div className="ep-blog-meta">
                    <span>{featured.author}</span>
                    <span className="ep-blog-meta-dot">·</span>
                    <span>{featured.date}</span>
                    <span className="ep-blog-meta-dot">·</span>
                    <span>{featured.readTime}</span>
                  </div>
                  <span className="ep-blog-read-link">Read Article →</span>
                </div>
              </div>
              <div className="ep-blog-feat-deco" aria-hidden="true">
                <svg width="100%" height="100%" viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="160" cy="110" r="90" stroke="rgba(192,80,31,.12)" strokeWidth="1"/>
                  <circle cx="160" cy="110" r="60" stroke="rgba(192,80,31,.1)" strokeWidth="1"/>
                  <circle cx="160" cy="110" r="30" stroke="rgba(192,80,31,.15)" strokeWidth="1"/>
                  <line x1="70" y1="110" x2="250" y2="110" stroke="rgba(192,80,31,.08)" strokeWidth="1"/>
                  <line x1="160" y1="20" x2="160" y2="200" stroke="rgba(192,80,31,.08)" strokeWidth="1"/>
                  <text x="160" y="118" textAnchor="middle" fontFamily="Georgia,serif" fontSize="48" fontStyle="italic" fontWeight="700" fill="rgba(192,80,31,.18)">G</text>
                </svg>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DIVIDER */}
      <div className="ep-blog-wrap">
        <div className="ep-blog-divider">
          <span className="ep-blog-divider-label">More Articles</span>
        </div>
      </div>

      {/* GRID */}
      <div className="ep-blog-wrap ep-blog-grid-wrap">
        <div className="ep-blog-grid">
          {rest.map(post => {
            const catColor = CATEGORY_COLORS[post.category] || CATEGORY_COLORS['Pedagogy'];
            return (
              <div key={post.id} className="ep-blog-card" onClick={() => setActivePost(post)}>
                <span
                  className="ep-blog-cat-badge"
                  style={{ background: catColor.bg, color: catColor.text, borderColor: catColor.border }}
                >
                  {post.category}
                </span>
                <h3 className="ep-blog-card-title">{post.title}</h3>
                <p className="ep-blog-card-excerpt">{post.excerpt}</p>
                <div className="ep-blog-card-foot">
                  <div className="ep-blog-meta">
                    <span>{post.date}</span>
                    <span className="ep-blog-meta-dot">·</span>
                    <span>{post.readTime}</span>
                  </div>
                  <span className="ep-blog-card-arrow">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="ep-blog-footer">
        <div className="ep-blog-footer-brand">Epoch.</div>
        <div className="ep-blog-footer-links">
          <button className="ep-blog-footer-link" onClick={() => navigate('/')}>Home</button>
          <button className="ep-blog-footer-link" onClick={() => navigate('/status')}>Status</button>
          <button className="ep-blog-footer-link" onClick={() => navigate('/subprocessors')}>Subprocessors</button>
        </div>
        <div className="ep-blog-footer-copy">© {new Date().getFullYear()} Epoch. Built for educators.</div>
      </footer>
    </div>
  );
}

function BlogStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,400;1,600;1,700&family=Outfit:wght@300;400;500;600&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{
        --rust:#c0501f;--rust-d:#8f3a14;--rust-l:rgba(192,80,31,.1);
        --parch:#f2e8d9;--parch2:#e8dbc8;--parch3:#ddd0bb;
        --ink:#1a1612;--ink7:rgba(26,22,18,.88);--ink5:rgba(26,22,18,.68);--ink3:rgba(26,22,18,.45);
        --night:#110f0c;--night2:#1c1915;
        --serif:'Cormorant Garamond',Georgia,serif;
        --sans:'Outfit',system-ui,sans-serif;
      }

      .ep-blog-root{font-family:var(--sans);background:var(--parch);color:var(--ink);min-height:100vh;overflow-x:hidden}

      /* NAV */
      .ep-blog-nav{position:fixed;top:0;left:0;right:0;z-index:300;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:var(--night);border-bottom:1px solid rgba(192,80,31,.25)}
      .ep-blog-brand{font-family:var(--serif);font-size:22px;font-weight:700;color:var(--parch);letter-spacing:.01em;position:absolute;left:50%;transform:translateX(-50%)}
      .ep-blog-brand span{color:var(--rust)}
      .ep-blog-back-btn{display:flex;align-items:center;gap:8px;font-family:var(--sans);font-size:12px;font-weight:400;letter-spacing:.06em;color:rgba(242,232,217,.55);background:none;border:none;cursor:pointer;transition:color .2s;padding:0}
      .ep-blog-back-btn:hover{color:var(--parch)}
      .ep-blog-nav-cta{font-family:var(--sans);font-size:13px;font-weight:500;padding:8px 20px;background:var(--rust);color:#fff;border:none;cursor:pointer;border-radius:3px;transition:background .2s}
      .ep-blog-nav-cta:hover{background:var(--rust-d)}

      /* HERO */
      .ep-blog-hero{padding:140px 32px 80px;background:var(--night);text-align:center;position:relative;overflow:hidden}
      .ep-blog-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 50%,rgba(192,80,31,.08) 0%,transparent 70%);pointer-events:none}
      .ep-blog-hero-inner{position:relative;z-index:2;max-width:700px;margin:0 auto}
      .ep-blog-hero-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--rust);margin-bottom:28px;padding:7px 16px;border:1px solid rgba(192,80,31,.3);border-radius:2px}
      .ep-blog-hero-h1{font-family:var(--serif);font-size:clamp(44px,7vw,80px);font-weight:700;line-height:.92;color:var(--parch);margin-bottom:22px}
      .ep-blog-hero-h1 em{font-style:italic;color:var(--rust);display:block}
      .ep-blog-hero-sub{font-size:15px;font-weight:300;line-height:1.85;color:rgba(242,232,217,.7);max-width:460px;margin:0 auto}

      /* LAYOUT */
      .ep-blog-wrap{max-width:1100px;margin:0 auto;padding:0 40px}
      .ep-blog-featured-wrap{padding-top:64px;padding-bottom:0}
      .ep-blog-grid-wrap{padding-top:0;padding-bottom:80px}

      /* CAT BADGE */
      .ep-blog-cat-badge{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:4px 10px;border-radius:99px;border:1px solid;margin-bottom:16px}

      /* FEATURED */
      .ep-blog-featured{display:grid;grid-template-columns:1fr 280px;gap:0;border-radius:12px;border:1px solid var(--parch3);background:#fff;overflow:hidden;cursor:pointer;transition:box-shadow .25s,transform .25s,border-color .25s;box-shadow:0 8px 32px rgba(26,22,18,.07)}
      .ep-blog-featured:hover{box-shadow:0 16px 56px rgba(26,22,18,.13);transform:translateY(-3px);border-color:rgba(192,80,31,.3)}
      .ep-blog-feat-content{padding:48px 48px 40px}
      .ep-blog-feat-title{font-family:var(--serif);font-size:clamp(26px,3.5vw,40px);font-weight:700;line-height:1.1;color:var(--ink);margin-bottom:16px}
      .ep-blog-feat-excerpt{font-size:15px;font-weight:300;line-height:1.8;color:var(--ink5);margin-bottom:32px}
      .ep-blog-feat-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
      .ep-blog-meta{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:400;color:var(--ink3)}
      .ep-blog-meta-dot{opacity:.5}
      .ep-blog-read-link{font-size:13px;font-weight:500;color:var(--rust);letter-spacing:.02em}
      .ep-blog-feat-deco{background:var(--parch);border-left:1px solid var(--parch3);display:flex;align-items:center;justify-content:center;padding:32px}

      /* DIVIDER */
      .ep-blog-divider{display:flex;align-items:center;gap:18px;padding:48px 0 36px}
      .ep-blog-divider::before,.ep-blog-divider::after{content:'';flex:1;height:1px;background:var(--parch3)}
      .ep-blog-divider-label{font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--ink3);white-space:nowrap}

      /* GRID */
      .ep-blog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
      .ep-blog-card{background:#fff;border-radius:10px;border:1px solid var(--parch3);padding:32px 28px 24px;cursor:pointer;transition:box-shadow .2s,transform .2s,border-color .2s;display:flex;flex-direction:column}
      .ep-blog-card:hover{box-shadow:0 12px 40px rgba(26,22,18,.1);transform:translateY(-2px);border-color:rgba(192,80,31,.25)}
      .ep-blog-card-title{font-family:var(--serif);font-size:22px;font-weight:700;line-height:1.18;color:var(--ink);margin-bottom:12px}
      .ep-blog-card-excerpt{font-size:13px;font-weight:300;line-height:1.75;color:var(--ink5);flex:1;margin-bottom:24px}
      .ep-blog-card-foot{display:flex;align-items:center;justify-content:space-between;margin-top:auto}
      .ep-blog-card-arrow{font-size:16px;color:var(--rust);opacity:.6;transition:opacity .2s,transform .2s}
      .ep-blog-card:hover .ep-blog-card-arrow{opacity:1;transform:translateX(3px)}

      /* ARTICLE */
      .ep-blog-article{max-width:680px;margin:100px auto 80px;padding:0 32px}
      .ep-blog-article-head{padding-bottom:40px;border-bottom:1px solid var(--parch3);margin-bottom:48px}
      .ep-blog-article-title{font-family:var(--serif);font-size:clamp(32px,5vw,56px);font-weight:700;line-height:1.05;color:var(--ink);margin-bottom:20px}
      .ep-blog-article-meta{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink3)}
      .ep-blog-article-body{font-size:16px;font-weight:300;line-height:1.85;color:var(--ink7)}
      .ep-blog-article-body h2{font-family:var(--serif);font-size:26px;font-weight:700;color:var(--ink);margin:48px 0 16px;line-height:1.2}
      .ep-blog-article-body p{margin-bottom:24px}
      .ep-blog-article-body strong{font-weight:600;color:var(--ink)}
      .ep-blog-article-body em{font-style:italic}
      .ep-blog-article-body ol,.ep-blog-article-body ul{margin:0 0 24px 24px;display:flex;flex-direction:column;gap:8px}
      .ep-blog-article-body li{font-size:15px;line-height:1.75}
      .ep-blog-article-foot{padding-top:48px;border-top:1px solid var(--parch3);margin-top:48px}
      .ep-blog-back-btn--foot{color:var(--ink5)}

      /* FOOTER */
      .ep-blog-footer{background:var(--night);border-top:1px solid rgba(242,232,217,.07);padding:28px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
      .ep-blog-footer-brand{font-family:var(--serif);font-size:18px;font-weight:700;color:rgba(242,232,217,.2)}
      .ep-blog-footer-links{display:flex;gap:24px}
      .ep-blog-footer-link{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,232,217,.2);background:none;border:none;cursor:pointer;font-family:var(--sans);transition:color .2s;padding:0}
      .ep-blog-footer-link:hover{color:var(--rust)}
      .ep-blog-footer-copy{font-size:11px;color:rgba(242,232,217,.14)}

      @media(max-width:900px){
        .ep-blog-featured{grid-template-columns:1fr}
        .ep-blog-feat-deco{display:none}
        .ep-blog-grid{grid-template-columns:1fr 1fr}
        .ep-blog-feat-content{padding:32px}
      }
      @media(max-width:600px){
        .ep-blog-grid{grid-template-columns:1fr}
        .ep-blog-wrap{padding:0 20px}
        .ep-blog-nav{padding:0 20px}
        .ep-blog-brand{display:none}
      }
    `}</style>
  );
}
