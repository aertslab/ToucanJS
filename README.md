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

* jobs 					=> queue, status, link to GFF files, show / hide related features from GFF
* cluster buster 		=> bed / fasta, motif locator integration
* motif collector 20k 	=> search interface in PWM catalogue, service

* exports: fasta, bed, gff, bigWig, workspace, image
* twoBit files locally to use twoBitToFa (?)
* info for files, regions, features
* context menu
* grouping of features per TF, name, file
* system log


## CR's

* sequences 		=> modal progress infobox, move to web worker, add also server-side job (e.g. via twoBitToFa)
* offcanvas 		=> change to e.g. fix sidebar with tabs, possibility to have multiple tabs open simultanously
* features		 	=> add group feature actions, move to foreground / background, center, when region is hidden disable reverse and move, cut one, rename sequences on cut ?
* search			=> add mouseover tooltip
* bigwig files		=> position over/under current region
* bed files 		=> show/hide trigger should show/hide sequences from this file ?
* when region (or file ?) is hidden => share its space amongst rest of displayed regions


## PR's

* sometimes the offcanvas is not hiding