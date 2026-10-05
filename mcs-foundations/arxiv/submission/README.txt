MCS arXiv submission package
============================

Upload these two files:

1. MCS-arXiv-source.zip
   Choose the TeX/LaTeX submission route. The archive has a top-level main.tex;
   references.bib and the generated main.bbl are included.

2. MCS-arXiv-ancillary.zip
   Upload under "Ancillary files". It contains anc/ and evidence/replay-final/.
   The paper's Appendix A gives the command and scope.

The PDF in this directory is the author's rendered reference copy. arXiv will
generate its own PDF from the source archive; inspect that generated PDF before
the final submit action.

Before submitting
-----------------
1. Log in with the arXiv account whose identity matches the author.
2. Check whether cs.AI or cs.LO requires endorsement for this account.
3. Fill the form from arXiv-submit-fields.txt.
   Paste the title as a single line.
4. Choose the license explicitly.
5. Inspect the generated PDF and the ancillary file listing.
6. Submit only after confirming the author name, email, category, and license.

Verification performed
----------------------
The source zip was extracted into an empty directory and compiled with
pdflatex + bibtex + pdflatex + pdflatex. The build produced 16 pages with no
unresolved references or overfull boxes. The ancillary zip was extracted into
an empty directory and anc/run.py was executed there; the four stable reports
matched evidence/replay-final/ byte for byte. See SHA256SUMS.txt for hashes.
