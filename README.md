# ToucanJS website

## Web root
Symlink this folder to your web root directory:

```
\public\
```

## Supported browsers
Chrome	Edge	Firefox		IExplorer	Opera	Safari
24		12		44			11			17		10

## Toucan WS

http://tomcat.esat.kuleuven.be/axis/ToucanSOAPService.jws?wsdl

##  New features

* get sequences => client-side (e.g. via DAS), server-side job (e.g. via twoBitToFa)
	assembly definition:
		1* 9th column of GFF
		2* ask user (one for all)
	position definition:
		1* 1st column of GFF
		2* 9th column of GFF
		3* BED file (match on name)
	on upload get sequences and reverse compliment
	possibility to export to FASTa

* relative move & cut with config
* reverse compliment visualisation
* continuous track => upload & parse bigWig (how to position them in current graph ?)
* species and genome awareness => UCSC links
* sequence => reverse compliment - user action
* feature actions => move to foreground / background, center, remove
* jobs => queue, status, link to GFF files, show / hide related features from GFF
* cluster buster => bed / fasta, motif locator integration
* motif collector 20k => search interface in PWM catalogue, service
* exports: fasta, bed, gff, bigWig, workspace, image
* twoBit files locally to use twoBitToFa (?)
* info for files, regions, features
* grouping of features per TF, name, file


## CR's

* offcanvas sidebar => proposal : fix sidebar with tabs, possibility to have multiple tabs open simultanously
* get sequences => web worker ?


## PR's

* multiple GFF one after another (different features, same regions) => only first GFF is drawn
* when zoomed scroll to top => feature on positive strand is not fully visible
