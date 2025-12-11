# [[ page-title ]]

In 2017, the [Attention Is All You Need](https://arxiv.org/abs/1706.03762) paper introduced the
[transformer](https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)), a neural
network architecture which has become the dominant type of machine learning model, especially in the
area of large language models (LLMs).

This page and the accompanying
[Jupyter notebook](https://github.com/mariogemoll/attention-is-all-you-need/blob/main/py/notebook.ipynb)
describe an attempt at recreating the training setup described in the paper and recreating some of
its results.

While LLMs are nowadays mostly "decoder-only" transformers, the original transformer was an
encoder-decoder sequence-to-sequence model used primarily for machine translation. In other words,
it was a translation machine. The following describes the process of building such a machine for
English-German translation (in the paper they did this for English-German and English-French).

## Dataset

Attention Is All You Need was a contribution to the
[Conference on Neural Information Processing Systems](https://neurips.cc/Conferences/2017) (NIPS,
called NeurIPS since 2018) in 2017 and used data of the
[machine translation task](https://www.statmt.org/wmt14/translation-task.html) of the
2014 Workshop on Statistical Machine Translation (WMT14). The dataset for the English-German
language pair consists of three parallel corpora (collections of sentences/text snippets in multiple
languags):

* The European Parliament Proceedings Parallel Corpus (Europarl), version 7: Documents produced by the
European Parlament are usually translated into all 24 EU languages. Europarl is a collection of
sentences in 11 languages taken from the proceedings of the European Parlament (ie. political
speeches).
* A parallel text corpus extracted from Common Crawl.
* News Commentary, version 9: mostly text taken from economic and political news articles.

The WMT14 task description page also lists the test set, "newstest2014" as well as the recommended
dev/validation set "newstest2013" (the test set of WMT13).

[[ corpora-widget ]]

## Common Crawl issues

When inspecting the training data, it becomes clear that the Common Crawl Parallel Corpus portion of
the WMT14 dataset introduces noticeable noise. A manual review of random samples shows that some
sentence pairs are not actual translations:

[[ not-translations-table ]]

In other cases, the entries are not even bilingual:

[[ not-bilingual-table ]]

This is likely due to how the corpus was created. The dataset was generated automatically from the
[Common Crawl](https://commoncrawl.org/) web archive using a
[large-scale alignment procedure](https://www2.statmt.org/mtm12/pub/crawl-final.pdf): First, pages
whose URLs look like they are available in multiple languages were selected, e.g.
https://example.com/page_en.html and https://example.com/page_de.html. Then it was assumed there
is a direct correspondence between the sentences on those pages, and they were matched. This rather
crude algorithm leads to a lot of data, however the data is quite noisy, in other words a
substantial part of the translations are completely off. However, it seems like giving the model
more data to train on, even if the quality is not the best, is beneficial.

## Cleaning, tokenization, bucketing

In a first step, a cleaning script is applied to all the input text file pairs to do the following:

* NFKC Unicode normalization
* Replacing some characters, e.g. all sorts of quotation marks with simple double quotes
* Removing all pairs where one of the sentences is empty (no translation)
* Removing all pairs where at least one of the sentences contains characters not included in a
rather small set of standard European language characters

All text gets tokenized using a vocabulary of 32768 tokens. Any sentence pairs where any of the two
sequences exceeds 176 tokens is filtered out and the three training set corpora (Europarl, Common
Crawl and News Commentary) get merged into one big dataset. This leaves about 4.45M sentences, about
70K (1.6%) of the original dataset have been filtered out by the cleaning and truncating procedures.

To reduce padding, the sentence pairs are sorted into buckets according to the length of the longest
of the two sequences of each pair.

[[ buckets-widget ]]

## Model

The model architecture follows the base configuration in the Attention Is All You Need paper: An
encoder-decoder transformer with 6 encoder and 6 decoder layers, 512 model dimensions, 8 attention
heads. The feed-forward layers have 2,048 dimensions. The vocabulary has a size of 32,768. The model
has 77M parameters.

## Training

We train for 15 epochs on a machine with eight RTX 5090 GPUs. One epoch takes about three minutes.
The rental cost for the machine is roughly $4 per hour, so one full training run takes about 45
minutes and costs approximately $3 (and consumes about 0.75h × 8 × 600W = 3.6kWh of energy). For
comparison, the original Attention Is All You Need paper reported a training time of around 12 hours
for a comparable number of tokens.

## Result

The cross-entropy loss goes down to about 2.4, or equivalently a perplexity of about 11. The
Attention Is All You Need paper reached a perplexity of 4.92 for the base model.

[[ train-loss-widget ]]

[[ loss-widget ]]

On BLEU (Newstest 2014 testset), the model achieves a score of 19.1, while the value reported in the
paper is 25.8.

[[ bleu-widget ]]

So overall, the goal of matching the results of the paper has not fully been achieved (yet).
However, the translation is
[somewhat working](https://colab.research.google.com/github/mariogemoll/attention-is-all-you-need/blob/main/py/usage.ipynb).

## Room for improvement?

The following possible optimizations have not been implemented yet and might lead to improvements in
the future:

* Label smoothing
* Removing sentence pairs whose sentences differ a lot in length
* Learning rate schedule improvements
* Applying dropout to embeddings and positional encoding (in addition to sub-layers)
* Sharing all embeddings (source, target, output)
