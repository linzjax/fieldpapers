var lightbox = function(){
	var images = document.getElementsByClassName('image');
	var imagesArray = Array.prototype.slice.call(images);

	var $lightbox = document.getElementsByClassName('gallery-lightbox')[0];

	imagesArray.forEach(function(image){
		image.addEventListener('click', function(e){
			var src = image.childNodes[1].getAttribute('src');
			$lightbox.childNodes[1].childNodes[1].setAttribute('src', src);
			$lightbox.classList.remove('hidden');
		});
	});

	$lightbox.addEventListener('click', function(e){
		$lightbox.classList.add('hidden');
	});
};


document.addEventListener('load', (function(){
	// document.getElementById('gallery').addEventListener('click', function(e){
	// 	e.preventDefault();
	// 	scroll('gallery-box');
	// });
	lightbox();
})());