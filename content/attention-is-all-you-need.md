# Attention Is All You Need

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
minutes and costs approximately $3. For comparison, the original Attention Is All You Need paper
reported a training time of around 12 hours for a comparable number of tokens.

## Result

[[ train-loss-widget ]]

[[ loss-widget ]]

[[ bleu-widget ]]
