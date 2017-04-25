# ToucanJS website

## Configuration
Edit the below file(s) to configure your installation:

```
\config.php
```

## DB schema
You can create your copy of the database using the below SQL file(s):

```
\dbscheme.sql
```

## Web root
Symlink this folder to your web root directory:

```
\public\
```

## RW access
Grant web users read-write access to the folder(s) listed below:
```
\uploads\
```


## Supported browsers
Chrome	Edge	Firefox (Gecko)	Internet Explorer	Opera	Safari
57		12		44 (44)			11					17		10.0

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
* search => regexp match on sequence and reverse compliment sequence, options to name a new feature group with user defined score
* sequence => reverse compliment - user action
* feature => move to foreground / background
* jobs => queue, status, link to GFF files, show / hide related features from GFF
* cluster buster => bed / fasta, motif locator integration
* motif collector 20k => search interface in PWM catalogue, service
* exports: fasta, bed, gff, bigWig, workspace, image
* twoBit files locally to use twoBitToFa (?)
* info for files, regions, features
* grouping of features per TF, name, file

## CR's

* offcanvas sidebar => proposal : fix sidebar with tabs, possibility to have multiple tabs open simultanously


## PR's

* multiple GFF one after another (different features, same regions) => only first GFF is drawn
