# Video generation options for Strang

Research date: July 25, 2026

## Recommendation

Do not replace HeyGen Video Agent with a raw text-to-video model for every
scene. For Strang's educational use case, the best target architecture is:

1. Keep Strang's existing screenplay generator.
2. Render readable text, diagrams, charts, and transitions with Hyperframes
   or Shotstack.
3. Add narration with HeyGen Starfish TTS or another TTS API.
4. Use Runway Gen-4 Turbo only for the few scenes that genuinely benefit from
   generated footage.

This is more controllable for dense academic material and substantially
cheaper than asking a generative model to create every second of a video.

## Price comparison

The estimates below normalize published prices to one minute of output. They
exclude Strang's screenplay-LLM cost unless stated otherwise.

| Provider | Published rate | Approx. 60-second cost | What is included | Strang fit |
| --- | ---: | ---: | --- | --- |
| HeyGen Video Agent | $0.0333/sec | $2.00 | One-prompt composition, narration, rendering, hosted output | Easiest current workflow |
| HeyGen Hyperframes + Starfish TTS | $0.10/min render + $0.000667/sec speech | $0.14 plus assets/LLM | Deterministic HTML video and narration | Best cost/control target |
| Shotstack PAYG + TTS | $0.30/min render | About $0.34 plus assets/LLM | Template/API render; narration is separate | Strong vendor-neutral option |
| Runway Gen-4 Turbo | $0.05/sec | $3.00 before TTS/editing | Short 5- or 10-second 720p visual clips | Premium inserts only |
| Google Veo 3 video | $0.50/sec | $30.00 | Generated visuals, no audio | Too expensive for full explainers |
| Google Veo 3 video + audio | $0.75/sec | $45.00 | Generated video and synchronized audio | Too expensive and less controllable |

## Quality assessment

"Better" depends on the job:

- **Best cinematic short clips:** Veo or Runway can outperform a template
  renderer visually, but they are not complete long-form explainer systems.
- **Best one-call convenience:** HeyGen Video Agent remains the simplest
  option. It currently handles composition and rendering from one prompt.
- **Best for learning accuracy and readability:** a deterministic renderer is
  the better product fit. Equations, labels, quotations, definitions, charts,
  and citations need to remain exact; generated footage should support them,
  not replace them.
- **Best commercial unit economics:** Hyperframes plus TTS is the leading
  candidate. Based on list prices, its core render-and-voice cost is about
  $0.14 per output minute versus about $2.00 for Video Agent, before optional
  media and LLM costs.

The last two conclusions are product inferences from Strang's requirements and
the vendors' published capabilities, not vendor benchmark claims. A controlled
test should score factual visual alignment, text legibility, generation time,
failure rate, and student comprehension before switching production traffic.

## Migration plan

1. Build one 45- to 60-second Hyperframes prototype from the existing
   `Screenplay` JSON.
2. Render the same ten passages through Video Agent and the prototype.
3. Blind-score both versions for clarity, factual alignment, visual quality,
   latency, and cost.
4. If the renderer wins, use it as the default engine and reserve Runway for
   optional premium scenes.

## Primary sources

- [HeyGen self-serve API pricing](https://developers.heygen.com/docs/pricing)
- [HeyGen Video Agent workflow](https://developers.heygen.com/docs/overview)
- [Runway API billing](https://docs.dev.runwayml.com/usage/billing/)
- [Google Vertex AI generative media pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Shotstack pricing](https://shotstack.io/pricing/)

