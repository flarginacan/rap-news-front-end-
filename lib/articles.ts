import { Article } from '@/types'

// Helper to parse markdown frontmatter and content
function parseMarkdown(markdown: string): { frontmatter: Record<string, any>, content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = markdown.match(frontmatterRegex)
  
  if (!match) {
    return { frontmatter: {}, content: markdown }
  }
  
  const frontmatterText = match[1]
  const content = match[2].trim()
  
  const frontmatter: Record<string, any> = {}
  const lines = frontmatterText.split('\n')
  let i = 0
  
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }
    
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) {
      i++
      continue
    }
    
    const key = line.slice(0, colonIndex).trim()
    let value: any = line.slice(colonIndex + 1).trim()
    
    // Handle arrays (tags, sources, etc.)
    if (value === '' && i + 1 < lines.length && lines[i + 1].trim().startsWith('-')) {
      const arrayValues: string[] = []
      i++ // Move to first array item
      while (i < lines.length && lines[i].trim().startsWith('-')) {
        let item = lines[i].trim().slice(1).trim()
        // Remove quotes
        if ((item.startsWith('"') && item.endsWith('"')) || 
            (item.startsWith("'") && item.endsWith("'"))) {
          item = item.slice(1, -1)
        }
        arrayValues.push(item)
        i++
      }
      frontmatter[key] = arrayValues
      continue
    }
    
    // Remove quotes from single values
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    // Handle date
    if (key === 'date' && typeof value === 'string' && value.includes('T')) {
      frontmatter[key] = new Date(value)
    } else {
      frontmatter[key] = value
    }
    
    i++
  }
  
  return { frontmatter, content }
}

// Format date to relative time
function formatDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 60) {
    return `${diffMins} minutes ago`
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

// Clean title (remove markdown bold)
function cleanTitle(title: string): string {
  return title.replace(/\*\*/g, '').trim()
}

// Get category from tags or default
function getCategory(tags: string[] | undefined): string {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return 'NEWS'
  
  // Check all tags for category keywords
  const tagString = tags.join(' ').toLowerCase()
  if (tagString.includes('exclusive')) return 'EXCLUSIVE'
  if (tagString.includes('awards')) return 'AWARDS'
  if (tagString.includes('music')) return 'MUSIC'
  if (tagString.includes('charts')) return 'CHARTS'
  if (tagString.includes('controversy')) return 'CONTROVERSY'
  
  return 'NEWS'
}

// Generate image URL based on slug/artist
function getImageUrl(slug: string): string {
  // Use placeholder images for now - you can replace with actual images later
  const imageMap: Record<string, string> = {
    '21-savage': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=450&fit=crop',
    '50-cent': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=450&fit=crop',
    'cardi': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=450&fit=crop',
    'drake': 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=450&fit=crop',
    'eminem': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=450&fit=crop',
    'jay-z': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=450&fit=crop',
    'kanye': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=450&fit=crop',
    'kendrick': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=450&fit=crop',
  }
  
  for (const [key, url] of Object.entries(imageMap)) {
    if (slug.includes(key)) {
      return url
    }
  }
  
  return 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=450&fit=crop'
}

// Article data from markdown files
const articleMarkdowns = [
  {
    slug: 'exclusive-kendrick-lamar-calls-out-grammy-history-for-diss-track-triumph',
    markdown: `---
title: "Exclusive: Kendrick Lamar Calls Out Grammy History For Diss Track Triumph"
date: 2026-01-01T01:33:07.639Z
slug: exclusive-kendrick-lamar-calls-out-grammy-history-for-diss-track-triumph
tags:
  - "kendrick-lamar"
  - "exclusive"
  - "music"
  - "awards"
---
Exclusive: Kendrick Lamar Calls Out Grammy History For Diss Track Triumph

Kendrick Lamar made significant Grammy history in early 2025. His diss track "Not Like Us" swept five major categories at the 67th Annual Grammy Awards. This monumental achievement marked a historic moment for hip-hop recognition at the prestigious ceremony. This latest success underscores Kendrick Lamar's dominant position in contemporary rap music and [more rap news](https://donaldbriggs.com/category/rap-news/).

## "Not Like Us" Dominates the Grammys

"Not Like Us" achieved an unprecedented feat by winning all five categories for which it was nominated. The track secured Song of the Year and Record of the Year. These wins placed Kendrick's highly publicized Drake diss among the year's top songs across all genres. Furthermore, it earned awards for Best Music Video, Best Rap Performance, and Best Rap Song. This sweep was a landmark event for both Kendrick and the broader hip-hop landscape. It was the first time a diss track received such high-level recognition from the music industry.

## Cultural Impact and Artistic Merit

The song's release coincided with a heated feud between Kendrick Lamar and Drake. "Not Like Us" resonated deeply with listeners and industry insiders alike. Its sharp production and surgical lyrics contributed to its success. The cultural moment surrounding the feud added significant weight to the track. Many questioned if a diss record should compete in major categories. However, "Not Like Us" proved its doubters wrong with decisive wins. The song also achieved massive success on streaming platforms, topping charts for extended periods. Its cultural relevance remained strong long after its July 4, 2024 release.

## Visuals and Super Bowl Success

The music video for "Not Like Us," a collaboration between Kendrick Lamar and director Dave Free, also garnered significant acclaim. It ultimately won the award for Best Music Video. Following his Grammy triumph, Kendrick Lamar delivered a memorable 12-minute performance during the 2025 Super Bowl LIX halftime show. This performance prominently featured "Not Like Us," further celebrating his wins over Drake. He also performed "Luther" with SZA. The setlist included other hits like "HUMBLE" and "DNA." The Super Bowl performance drew massive viewership and widespread social media attention. It reinforced Kendrick's leading status in hip-hop.

## GNX Leads Streaming Charts

Additionally, Kendrick Lamar's album *GNX* proved to be a major force in streaming throughout 2025. The album finished as Spotify's most-streamed album overall for the year. *GNX* garnered over 2.8 billion streams on Spotify alone. While technically released in 2024, its momentum carried strongly into the following year. Standout tracks like "tv off," "luther," and "squabble up" remained in heavy rotation. According to a report from [Ratings Game Music](https://ratingsgamemusic.com/2025/12/31/kanye-wests-graduation-and-kendrick-lamars-gnx-lead-spotifys-biggest-albums-of-2025/), *GNX* secured nearly one billion more streams than the next closest album. This sustained impact highlights Kendrick's enduring cultural influence.

## Continued Recognition and Future Legacy

As of late 2025, Kendrick Lamar had already earned nine nominations for the 2026 Grammy Awards. His album *GNX* received multiple nominations, including Album of the Year. This suggests the Recording Academy continues to acknowledge his artistic excellence. The success of "Not Like Us" at the 67th Annual Grammy Awards, as detailed by [Red94.net](https://www.red94.net/news/65387-song-of-the-year-2025-kendrick-lamar-s-not-like-us-sweeps-grammys-claiming-massi/), opened doors for future diss tracks and hip-hop records. Kendrick's historic achievement represents a significant turning point. It validates hip-hop's storytelling and competitive elements as legitimate art forms. The 2026 Grammys will determine if this shift in recognition continues for other rap records. This ongoing success demonstrates [Kendrick Lamar's](https://donaldbriggs.com/category/rap-news/) profound impact on the music industry.`
  },
  {
    slug: 'exclusive-jay-z-showcases-lavish-lifestyle-in-rare-car-revelation',
    markdown: `---
title: "Exclusive: Jay-Z Showcases Lavish Lifestyle In Rare Car Revelation"
date: 2026-01-01T14:53:29.081Z
slug: exclusive-jay-z-showcases-lavish-lifestyle-in-rare-car-revelation
tags:
  - "jay-z"
  - "exclusive"
  - "music"
---
Exclusive: Jay-Z Showcases Lavish Lifestyle In Rare Car Revelation

Recent reports highlight Jay-Z's connection to extravagant vehicles, adding another layer to the ongoing [jay-z news]. The iconic rapper, known for his business acumen and musical legacy, is reportedly the owner of an exceptionally rare Rolls-Royce. This revelation offers a glimpse into the opulent lifestyle of the hip-hop mogul. Furthermore, discussions around his birthday and career continue to surface, emphasizing his enduring impact. Discover more [rap news] about influential figures in the genre.

## Lavish Rolls-Royce Ownership

Jay-Z reportedly owns a $28 million Rolls-Royce Boat Tail. This vehicle is noted as the most expensive car in rap music. It is also recognized as the world's most expensive street-legal new car. The Boat Tail is a limited edition with only three units produced globally. This particular car draws inspiration from the $13 million Sweptail model. The Rolls-Royce Boat Tail is a 19-foot-long convertible. It features a striking blue leather interior. Industry insiders have described meetings with the car's owner and his wife. These meetings apparently occurred at their residence and were described as welcoming. The source mentioned the owner's extensive watch collection, including Patek Philippe and Bugatti Tourbillon timepieces. These align with Jay-Z's known appreciation for luxury watches.

## Unique Vehicle Features

This Rolls-Royce boasts remarkable features, particularly in its rear compartment. The rear opens to reveal a champagne cooler. It also includes a Christofle picnic set. Additionally, cocktail tables and matching chairs are stored there. A full-sized parasol is also part of the impressive setup. The champagne cooler is reportedly stocked with Armand de Brignac. Jay-Z is a part-owner of this champagne brand. This detail further links him to the luxury accouterments. The true ownership of the Boat Tail remains officially unconfirmed. The couple is known for their private nature. However, there have been rumored sightings of the car in Dubai. While the specific car has not been publicly confirmed with Jay-Z, the couple possesses other impressive vehicles. Jay-Z owns the unique Maybach Exelero. He also received a $1.6 million Bugatti as a birthday gift in 2010 from Beyoncé. Beyoncé herself enjoys a rare 1959 Silver Cloud Rolls-Royce II Drophead. These automobiles showcase the couple's shared passion for luxury cars. Learn more about automotive luxury at [Supercar Blondie](https://supercarblondie.com/jay-z-expensive-ride-rolls-royce/).

## Celebrating Jay-Z's Legacy

Beyond his material possessions, Jay-Z's career and influence are frequently celebrated. His birthday on December 4th has been acknowledged as "Jay-Z Day" in some circles. The Brooklyn Public Library even hosted an exhibition titled "The Book of Hov." This exhibit celebrated the rapper's life and career. It highlighted his journey from street hustling to mogul status. Such events underscore his significant impact on music and culture. His work, including projects like "The Trayvon Martin Story," has shed light on systemic injustices. This dual focus on his lavish lifestyle and cultural contributions provides a comprehensive view of the hip-hop icon. Explore more about his impact in [rap news](https://donaldbriggs.com/category/rap-news/).`
  },
  {
    slug: '21-savage-urges-industry-peers-to-prioritize-music-over-street-matters',
    markdown: `---
title: "**21 Savage Urges Industry Peers to Prioritize Music Over Street Matters**"
date: 2025-12-30T20:53:00.698Z
slug: 21-savage-urges-industry-peers-to-prioritize-music-over-street-matters
tags:
  - "21-savage"
  - "music"
  - "charts"
---
**21 Savage Urges Industry Peers to Prioritize Music Over Street Matters**

Atlanta rapper 21 Savage has taken to social media, extending an appeal to fellow artists to shift focus away from street entanglements and towards their music careers, citing the associated trauma. This initiative comes in the wake of his album "What Happened To the Streets?" topping Billboard's Top R&B/Hip-Hop Albums chart.

The artist, whose real name is mentioned as Saint Laurent Don on X, directly addressed several prominent figures in the industry. He urged Young Thug and Gunna to resolve their differences and rekindle their past bond, noting their previous close working relationship prior to Thug's RICO trial. 21 Savage's messages, posted on December 17, 2025, specifically referenced Gunna's plea deal and admission that YSL (Young Stoner Life Records) was a gang. He stated, "you knew gunna wasn't no gangster when he told the first time and we swept it under the rug for you you know he wasn't tryna leave you to hang nigga fuck the streets we ain't get shit but trauma from that." Young Thug later responded with a simple affirmation, "F**k the streets."

Beyond this exchange, 21 Savage also reached out to Lil Baby, as well as former Migos members Offset and Quavo. He suggested to Offset and Quavo that reuniting would have made them "unstoppable," recalling that he had previously advised them to "squash it." The rapper also acknowledged that he should have initially contacted Future, who responded by calling 21 Savage "lil brother for infinity." The album "What Happened to the Streets?" itself features collaborations with artists such as Young Nudy, Latto, Drake, GloRilla, G Herbo, Metro Boomin, and Lil Baby.

"What Happened to the Streets?" has achieved significant commercial success, marking 21 Savage's fifth consecutive No. 1 on Billboard's Top R&B/Hip-Hop Albums Chart for the chart dated December 27. The album, released on December 12, earned 73,000 equivalent album units in its tracking week. It also secured the No. 1 spot on the Top Rap Albums chart and ranked No. 3 on the Billboard 200. Furthermore, thirteen tracks from the album have appeared on the Hot R&B/Hip-Hop Songs chart. This release follows 21 Savage's 2024 album, "American Dream."`
  },
  {
    slug: 'cardi-b-addresses-fan-backlash-over-relationship-christmas-plans',
    markdown: `---
title: "**Cardi B Addresses Fan Backlash Over Relationship, Christmas Plans**"
date: 2025-12-30T18:13:37.212Z
slug: cardi-b-addresses-fan-backlash-over-relationship-christmas-plans
tags:
  - "cardi"
  - "music"
  - "relationship"
---
**Cardi B Addresses Fan Backlash Over Relationship, Christmas Plans**

Rapper Cardi B has spoken out against online criticism regarding her relationship with NFL player Stefon Diggs and her holiday arrangements. The artist urged fans to "calm down" after several days of what she described as excessive negativity.

Cardi B addressed the criticism via social media, stating, "Y'all need to calm down. Y'all been dragging me for three or four days and y'all been a little bit too mean." She emphasized that she cannot change past decisions and must focus on moving forward, particularly as she prepares for a busy upcoming year. The rapper cited her recent welcoming of a baby boy with Diggs in November as a factor in her current life circumstances. Cardi B also has three children with her estranged husband, Offset.

The online discussion intensified following speculation that Diggs did not spend Christmas Day with Cardi B and their newborn son. Cardi B's longtime best friend, Ken Barbie, addressed these rumors, explaining that holiday arrangements are often dictated by co-parenting logistics and the conditions set by other parents involved. Barbie stated that such boundaries are commonplace and should be respected, and that children should not be placed in situations with unresolved tension. He also noted that Diggs spending Christmas with his children was a priority.

Cardi B also highlighted her need for fan support as she gears up for her first headlining tour, the "Little Miss Drama Tour," set to begin in February. She expressed stress over the extensive rehearsal schedule and time away from her personal life, asking for fans to support her upcoming work rather than focus on her personal choices. The tour shares its name with her sophomore album, "Am I the Drama?".`
  },
  {
    slug: 'exclusive-50-cent-reacts-to-diddys-sons-docuseries-drama',
    markdown: `---
title: "Exclusive: 50 Cent Reacts To Diddy's Sons' Docuseries Drama"
date: 2025-12-31T12:51:21.342Z
slug: exclusive-50-cent-reacts-to-diddys-sons-docuseries-drama
tags:
  - "50-cent"
  - "exclusive"
  - "music"
  - "charts"
---
Exclusive: 50 Cent Reacts To Diddy's Sons' Docuseries Drama

50 Cent shared his thoughts on the upcoming docuseries from Diddy's sons. This latest cent news comes as Justin and Christian Combs announced their project. The rapper also reacted to his streaming numbers, solidifying his status.

## Diddy Sons Announce Docuseries

Sean 'Diddy' Combs' sons, Justin and Christian 'King' Combs, announced their plan to release a docuseries about their father. They shared this news on their social media accounts. This announcement quickly caught the attention of 50 Cent. He is known to be a long-time rival of Diddy.

50 Cent previously co-produced the Netflix docuseries *Sean Combs: The Reckoning*. He shared the trailer for the new docuseries on his Instagram account. His caption read, "Wow 👀 I want to see this show, 😟 I'm not sure this was a good idea. @50centaction."

## New Docuseries Details

The docuseries aims to share the Combs siblings' firsthand experiences. It will focus on their lives growing up under public scrutiny. Reports suggest the project will include footage and recordings sourced directly from Diddy's team. This approach aims to ensure narrative control.

Furthermore, the series is expected to differ from the Netflix production. It reportedly contains footage from days before Diddy's September 2024 arrest. He faces charges including sexual trafficking, transportation for prostitution, and racketeering. The trailer showed the siblings watching clips of their father's courtroom battles. Publicly negative perceptions of Diddy were also heard in soundbites. The docuseries is slated for a 2026 release on the Zeus Network. Its exact title and release date remain unannounced.

## Diddy Considers Legal Action

Meanwhile, Diddy's legal team is reportedly considering a lawsuit against Netflix. A spokesperson for Bad Boy Records stated this in an exclusive interview with Deadline. Diddy is currently incarcerated in New Jersey. He received a 30-month prison sentence for his conviction on two counts of transportation to engage in prostitution.

Before Netflix released its four-part docuseries, Diddy's legal team sent a cease and desist letter. The letter addressed Netflix co-CEO Ted Sarandos. They accused him of "corporate retribution." This allegedly stemmed from Combs declining a proposed 2023 documentary project. The letter asserted that Combs "will not hesitate to do so against Netflix." Netflix and 50 Cent have not yet responded to these legal threats. This cent news highlights ongoing tensions within the industry.

## 50 Cent Dominates Streaming Charts

Separately, 50 Cent continues to demonstrate significant influence in music. He was named the most-streamed New York City rapper for 2025. This marks the third consecutive year for this distinction. The data came from music stats account Diverse Mentality, reviewing YouTube's global streaming charts.

50 Cent reacted to this news with his characteristic confidence. He wrote on Instagram, "I thought we got over this guys, it is the way it is. LOL @bransoncognac." The post conveyed a blend of sarcasm and self-assurance. This level of dominance, for him, is now routine. His classics remain popular in New York City.

Diverse Mentality noted that 50 Cent's music has dominated for years. This occurred despite him not releasing a new solo album since 2014. The account highlighted YouTube's 2025 data. It showed 50 Cent amassing 1.9 billion views globally. This figure placed him far ahead of other prominent New York rappers. Nicki Minaj followed at No. 2 with 1.22 billion views. Cardi B secured third place with 955 million views. Jay-Z ranked fourth with 711 million views.

## Longevity and Empire

The margin between 50 Cent and the other artists was significant. Diverse Mentality stated that 50 "dominated the numbers and by dominated we mean by a long distance from the other New York rappers." The account framed this achievement as proof of longevity. 50 Cent's response echoed this sentiment. "It is the way it is," he stated, suggesting the success was inevitable. The added "LOL" kept the tone light. His tag for Branson Cognac also reminded fans of his broader business empire.

50 Cent also released new music in 2025. This music supported his upcoming U.K. boxing series, *Fightland*. This moment reinforces 50 Cent's unique position in hip-hop. Even without a new solo album in over a decade, his catalog continues to perform at elite levels. The streams actively pursue him, rather than the other way around. This incredible career longevity is a key piece of rap news. Fans can find more [rap news](https://donaldbriggs.com/category/rap-news/) here.`
  },
  {
    slug: 'exclusive-eminem-calls-out-chart-longevity-for-enduring-impact',
    markdown: `---
title: "Exclusive: Eminem Calls Out Chart Longevity For Enduring Impact"
date: 2025-12-31T16:55:19.823Z
slug: exclusive-eminem-calls-out-chart-longevity-for-enduring-impact
tags:
  - "eminem"
  - "exclusive"
  - "music"
  - "charts"
---
Exclusive: Eminem Calls Out Chart Longevity For Enduring Impact

Eminem continues to dominate music charts, showcasing remarkable staying power. This latest news highlights his enduring influence in the rap world. More [rap news](https://donaldbriggs.com/category/rap-news/) is available for fans eager to stay updated. This enduring presence marks significant [eminem news] for the hip-hop community.

## Chart Dominance in the UK

Eminem demonstrates consistent influence on the UK music scene. His albums remain strong performers on official charts. The compilation album "Curtain Call: The Hits" has impressively moved up the charts. This album has now spent an astounding 702 weeks on the UK Albums Chart. This represents over 13 years of recognition. This achievement sets an extraordinary benchmark for hip hop albums in the UK. It underscores Eminem's lasting appeal.

"Curtain Call 2," his sequel compilation, also performs well. It currently sits at No.84 on the main chart. This album boasts an impressive run of 176 weeks. It previously peaked at No.3. This longevity shows fans engage with his post-2010 tracks. Hits like "Godzilla," "River," and "Rap God" continue to resonate.

## Deep Discography Resonates

The UK Hip Hop and R&B Albums Chart reveals more of Eminem's discography. His album "The Eminem Show" has surged 10 spots. It now sits at No.19. This marks its 680th week on this genre chart. Released in 2002, this album was once a worldwide best-seller. Its timeless appeal remains evident.

Other notable entries include "The Marshall Mathers LP." It is currently at No.37. It has spent a staggering 850 weeks on the chart. "Curtain Call" also holds a strong position at No.29. It has accumulated 937 weeks on the chart. These numbers reflect sustained engagement from UK listeners. They continue to revisit Eminem's catalog.

## A Heartfelt Tribute to a Legend

Beyond chart success, Eminem has shown deep respect for his inspirations. He wrote a heartfelt letter to Tupac Shakur's mother, Afeni Shakur. This letter was included in the biography "Tupac Remembered." It also appeared in an exhibit at the Tupac Amaru Shakur Center for the Arts. The letter expresses Eminem's gratitude. He called Afeni Shakur a true Queen.

The letter began with an apology for a "sloppy" sketch of Tupac. Eminem wished he had better pencils for his drawing. He wanted to show his love for his rap idol. The rapper thanked Shakur for opportunities in his early career. He stated Tupac's music inspired his whole career. Eminem described Tupac as the "true definition of 'Soldier.'"

## Enduring Legacy and Artistic Respect

Eminem shared how Tupac's music influenced his outlook. He mentioned putting on a "Tupac" tape when feeling down. This helped him cope before fame. Tupac gave him the courage to face criticism. Eminem credited the rapper for making him care less about public opinion. He signed the letter and his sketch as "Marshall." This showed he wrote from the heart. The drawing and handwriting impressed many online. It highlighted his artistic range beyond music. This [eminem news] underscores his multifaceted talent.

Notably, this impressive chart performance is not linked to recent tours or media appearances. It emphasizes the depth and influence of his music. Eminem did not release new music or make significant public appearances in the UK in 2025. Yet, his work continues to resonate with audiences. This trend speaks to the enduring connection fans have. They favor substance and artistry over fleeting trends. Eminem remains a benchmark for longevity and impact in hip hop. Fans can find more [eminem news](https://donaldbriggs.com/category/rap-news/) to stay informed.`
  },
  {
    slug: 'exclusive-kanye-west-slams-kim-kardashian-for-copying-bianca-censoris-style',
    markdown: `---
title: "Exclusive: Kanye West Slams Kim Kardashian for Copying Bianca Censori's Style"
date: 2025-12-31T06:48:51.834Z
slug: exclusive-kanye-west-slams-kim-kardashian-for-copying-bianca-censoris-style
tags:
  - "kanye-west"
  - "exclusive"
  - "music"
  - "controversy"
---
Exclusive: Kanye West Slams Kim Kardashian for Copying Bianca Censori's Style

Kanye West has publicly criticized his ex-wife Kim Kardashian. He claims she copied his current wife Bianca Censori's hairstyle. The rapper also stated Kardashian is past her prime. Fans can find more information on these ongoing discussions and find [more rap news](https://donaldbriggs.com/category/rap-news/).

## Kanye West's Style Accusations

Kanye West recently blasted Kim Kardashian over her new hairstyle. The reality star debuted a shorter do that received praise. However, West reportedly mocked her look. He accused her of copying his wife, Bianca Censori. An insider told RadarOnline.com that West constantly judges Kardashian's style. He claims he shaped her into a sex symbol. He also believes he is doing the same with Censori.

West and Kardashian have had public disagreements since their 2022 divorce. They share four children. Kardashian reportedly fears West, who has faced backlash for controversial statements. West and Censori reportedly plan a fashion line. This brand aims to rival Kardashian's Skims. West is reportedly "totally obsessed" with outdoing his ex.

## Controversy Over Personal Appearance

The rapper is reportedly calling Kardashian names over her appearance. He states she is "way past her prime." He also claims she is too filled with plastic for his attention. Instead, he praises Bianca Censori as a natural beauty. He believes Censori will surpass Kardashian's fame. Notably, Censori herself has faced accusations of imitating Kardashian's style. This irony does not seem to register with West. He often criticizes his ex and her family. [More details on celebrity style feuds](https://radaronline.com/p/kanye-west-slams-kim-kardashian-copying-bianca-censori-look/) are available.

## Kanye West Denies Viral Bucket List

Separately, Kanye West denied creating a viral handwritten bucket list. The list featured items like "write a book" and "make my own shampoos." Fans were convinced by the handwriting and tone. West stated on social media that the list was fake. He also confirmed it was not his handwriting. This marks a rare social media interaction from the rapper. He had previously been promoting shows in Mexico and Italy.

## Music and Fashion Updates

West appeared at Deon Cole's comedy show. He attended with his wife Bianca Censori. He told the crowd that a new album is in the works. This project might be the previously teased BULLY album. While not releasing much new music in 2025, his film *In Whose Name?* premiered in September. The film explored his experience living with bipolar disorder. Additionally, West released budget-friendly clothing items recently. These included BL-01 shoes for $60. You can read more about the bucket list denial and other updates at [Rap-Up](https://www.rap-up.com/article/kanye-west-denies-viral-bucket-list-handwriting/). Fans can also find [rap news](https://donaldbriggs.com/category/rap-news/) on similar topics.`
  },
  {
    slug: 'exclusive-big-sean-details-drake-collaboration-for-all-me',
    markdown: `---
title: "Exclusive: Big Sean Details Drake Collaboration For \"All Me\""
date: 2025-12-31T00:25:37.052Z
slug: exclusive-big-sean-details-drake-collaboration-for-all-me
tags:
  - "drake"
  - "exclusive"
  - "music"
---
Exclusive: Big Sean Details Drake Collaboration For "All Me"

Big Sean shared exciting details about his collaboration with Drake. He discussed Drake's reaction to his verse on the track "All Me." This latest drake news comes as Big Sean revisits his favorite features. For more rap news, stay tuned.

## Big Sean Revisits Favorite Features

Big Sean recently spoke with Billboard about his most memorable guest verses. He expressed a long-held dream of working with artists like Nas, Eminem, JAY-Z, and Wayne. The Detroit rapper feels fortunate to have collaborated with many of them. His notable features include tracks like Justin Bieber's "As Long As You Love Me." He also highlighted Dave East's "Man in the Mirror." Additionally, A$AP Mob's "Frat Rules" made his list.

## Collaboration with Leon Thomas

More recently, Big Sean discussed working with Leon Thomas. They collaborated on two songs, "PARTY FAVORS" and "VIBES DON'T LIE (Remix)." Thomas initially asked Big Sean to choose just one song. However, Big Sean ended up recording both tracks. He caught a vibe in the studio for "VIBES DON'T LIE (Remix)." Thomas then encouraged him to do both songs. Big Sean mentioned that more music with Thomas is coming soon. Fans might hear this new material on his next album.

## The "Clique" Moment

The Kanye West era produced iconic posse cuts. Big Sean recalled the significance of being on "Clique." This track featured Kanye West and JAY-Z. He mentioned there were eight other verses initially. All of those verses were removed. It was an honor for West and Hov to keep his verse. This experience remains very special to him. Producer Hit-Boy later revealed Pusha T was among those removed.

## Drake's "Ecstatic" Reaction

A classic collaboration is "All Me" from Drake's 2013 album *Nothing Was The Same*. Big Sean, Drake, and 2 Chainz created magic on the song. According to the Detroit rapper, Drake was "very surprised" by his verse. He remembered how excited Drake was upon receiving it. "He was very ecstatic," Big Sean stated. Drake was hyped up after hearing the verse. This moment was truly classic during the *Nothing Was The Same* era. Drake's features often become major drake news for fans.

## What's Next

Big Sean continues to deliver memorable verses. His collaborations with Leon Thomas suggest more new music. Fans anticipate hearing these tracks on his upcoming album. The artist's ability to create impactful features remains a highlight. For more updates on the hip-hop scene, check out [more rap news](https://donaldbriggs.com/category/rap-news/).`
  },
  {
    slug: 'exclusive-drake-features-spark-big-sean-drake-news-focus',
    markdown: `---
title: "Exclusive: Drake Features Spark Big Sean \"Drake News\" Focus"
date: 2025-12-31T08:49:36.442Z
slug: exclusive-drake-features-spark-big-sean-drake-news-focus
tags:
  - "drake"
  - "exclusive"
  - "music"
---
Exclusive: Drake Features Spark Big Sean "Drake News" Focus

Big Sean recently discussed his favorite rap features. This news comes as fans eagerly await more information on Drake's latest projects, making this "drake news" particularly interesting. He shared stories about verses that were almost removed. The Detroit rapper detailed special moments with artists like Kanye West and JAY-Z. Additionally, Big Sean spoke about Drake's reaction to his contribution on "All Me," offering a glimpse into that significant "drake news" moment. For more rap news, check out [rap news](https://donaldbriggs.com/category/rap-news/).

## Big Sean's Favorite Features

Big Sean spoke with Billboard about his career highlights. He revealed his dream collaborations included Nas, Eminem, JAY-Z, Ye, and Wayne. He has thankfully checked off many of these goals. Some collaborations happened more than once. His selected favorite features included Justin Bieber's "As Long As You Love Me." Dave East's "Man in the Mirror" also made his list. A$AP Mob's "Frat Rules" was another noted track.

## Working With Leon Thomas

More recently, Sean discussed features with Leon Thomas. These tracks were "PARTY FAVORS" and "VIBES DON'T LIE (Remix)." Both songs appeared on Thomas's HEEL album. Thomas initially asked Sean to choose only one song. Sean picked one, then spontaneously recorded another. He sent the second track to Thomas. Then, Thomas insisted Sean do both. They also have more music planned.

## The "Clique" Experience

Sean described his feature on Kanye West's "Clique" as "very special." This song came from Kanye's G.O.O.D Music era. He called it a "big moment" to share the track with Ye and Hov. There were initially eight other verses. However, these verses were removed. Sean felt honored that Ye and Hov kept his verse. Producer Hit-Boy later revealed Pusha T was among those removed.

## Drake's "Ecstatic" Reaction

The collaboration on "All Me" remains memorable. Drake, Sean, and 2 Chainz created magic on the 2013 track. Big Sean recalled Drake's reaction to his verse. Drake was "very surprised" by what Sean submitted. "He was very ecstatic," Sean stated. The rapper remembers Drake being very hyped. This was a classic moment during the *Nothing Was The Same* era. This insight adds to the ongoing "drake news" cycle.

## Industry Impact and Future Releases

Big Sean's contributions often elevate other artists' tracks. He acknowledged these moments as significant. The success of "All Me" showcased his talent. Drake's excitement highlighted the verse's impact. Sean also hinted at future collaborations. Fans can anticipate hearing more from him soon. More information on these projects may emerge later. This could provide additional "drake news" if he features again.`
  },
  {
    slug: '50-cent-drops-surprise-performance-at-college-football-playoff-game',
    markdown: `---
title: "50 Cent Drops Surprise Performance at College Football Playoff Game"
date: 2025-12-23T03:42:58.556Z
slug: 50-cent-drops-surprise-performance-at-college-football-playoff-game
tags: []
---
## 50 Cent Drops Surprise Performance at College Football Playoff Game

**Rapper Curtis "50 Cent" Jackson made a surprise appearance during a College Football Playoff game between Oklahoma and Alabama, performing his hit song "Many Men (Wish Death)."** The live rendition took place between the third and fourth quarters, injecting an unexpected energy boost into the already high-stakes contest.

**What Happened:**
50 Cent took the field at Oklahoma Memorial Stadium on December 19, 2025, to perform "Many Men." This appearance followed the song's adoption by the Oklahoma Sooners as a fourth-quarter hype track in the final weeks of their regular season. The performance occurred as Oklahoma trailed Alabama 27-17. Following the song, Oklahoma scored a touchdown on their ensuing drive.

**Context:**
The Oklahoma Sooners began incorporating 50 Cent's "Many Men (Wish Death)" into their game-day rituals in late November 2025. This tradition, aimed at energizing the team and fanbase, was reportedly initiated by linebacker Kobie McKinzie, who noted the importance of strong fourth-quarter traditions at other college football stadiums. Videos narrated by former players and coaches preceded the song's playing during recent regular-season home games. However, it was revealed that "Many Men" also serves as a pre-game ritual for the Alabama Crimson Tide, potentially providing an unforeseen motivational advantage to the visiting team.

**What to Watch Next:**
It remains unclear if 50 Cent will continue his involvement with college football traditions or if other artists might follow suit with similar surprise appearances. Additionally, the long-term impact of this musical juxtaposition on team momentum in future games is yet to be seen. Separately, 50 Cent was also noted to have attended a New Orleans Saints game against the New York Jets in Week 16 of the 2025 NFL season on December 21, 2025, though details of his presence at that event are limited to photographic evidence.

**Sources:**
* New Orleans Saints: [https://www.neworleanssaints.com/photos/photos-50-cent-saints-vs-jets-2025-nfl-week-16](https://www.neworleanssaints.com/photos/photos-50-cent-saints-vs-jets-2025-nfl-week-16)
* 247Sports: [https://247sports.com/college/oklahoma/article/50-cent-performs-many-men-during-oklahoma-cfp-home-game-267166608/](https://247sports.com/college/oklahoma/article/50-cent-performs-many-men-during-oklahoma-cfp-home-game-267166608/)
* Saturday Down South: [https://www.saturdaydownsouth.com/news/college-football/50-cent-gives-surprise-performance-at-oklahoma-alabama-game/](https://www.saturdaydownsouth.com/news/college-football/50-cent-gives-surprise-performance-at-oklahoma-alabama-game/)
* The Crimson White: [https://thecrimsonwhite.com/125581/sports/surprise-appearance-from-50-cent-motivates-alabama-in-round-1-of-cfp/](https://thecrimsonwhite.com/125581/sports/surprise-appearance-from-50-cent-motivates-alabama-in-round-1-of-cfp/)
* Yahoo Sports: [https://ca.sports.yahoo.com/news/50-cent-oklahoma-fan-explaining-042011193.html](https://ca.sports.yahoo.com/news/50-cent-oklahoma-fan-explaining-042011193.html)
* AP News: [https://apnews.com/article/50-cent-many-men-oklahoma-alabama-493f6dd3fb709e07cfbb38be31adab06](https://apnews.com/article/50-cent-many-men-oklahoma-alabama-493f6dd3fb709e07cfbb38be31adab06)`
  }
]

export function parseArticles(): Article[] {
  const articlesWithDates: Array<{ article: Article, date: Date }> = []
  
  for (const { slug, markdown } of articleMarkdowns) {
    const { frontmatter, content } = parseMarkdown(markdown)
    
    // Extract date from frontmatter
    let date: Date
    if (frontmatter.date instanceof Date) {
      date = frontmatter.date
    } else if (typeof frontmatter.date === 'string') {
      date = new Date(frontmatter.date)
    } else {
      // Fallback: try to extract from markdown
      const dateMatch = markdown.match(/date:\s*([^\n]+)/)
      date = dateMatch ? new Date(dateMatch[1]) : new Date()
    }
    
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : []
    
    const article: Article = {
      id: slug,
      slug: slug,
      title: cleanTitle(frontmatter.title || 'Untitled'),
      image: getImageUrl(slug),
      category: getCategory(tags),
      author: 'Rap News',
      date: formatDate(date),
      comments: Math.floor(Math.random() * 300) + 50,
      content: content,
    }
    
    articlesWithDates.push({ article, date })
  }
  
  // Sort by date (most recent first)
  articlesWithDates.sort((a, b) => b.date.getTime() - a.date.getTime())
  
  return articlesWithDates.map(item => item.article)
}

