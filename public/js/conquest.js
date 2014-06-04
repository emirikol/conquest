function clone(parent, child) {
	  child = $.extend({}, child);
		child.__proto__ = parent;
		child.super = parent;
		return child//child.init ? function() { return child.init.apply(child, arguments); } : child
	}
	
function attrs_to_css(attrs) {
	 res = '';
	 $.each(attrs, function(k,v) {
	   res += '['+k+'='+v+']';
	 });
   return res; 	 
}
	
phases = ['upkeep',  'soldier move',  'recruit','citi move', 'procreate'];
phase_names =  {
	'upkeep' : 'Upkeep',
	'citi move': 'Move Citizens', 
	'soldier move': 'Move Soldiers', 
	'pacify': 'Pacify',
	'recruit': 'Recruit', 
	'procreate': 'Procreate'
}
in_attack = false;
phase = '';
$(function() {
	actions = [
		{
			name : 'Next Phase',
			button : $("<button class='action' id='next_phase'>Next Phase</button>").appendTo($('#options')).click(function(ev) {
					 //check if player has enough point
					 if (phase == 'upkeep' && balance() < 0) {
						 alert("not enough action points. please de-militerize some citizens before continuing");
						 return
					 }
					 if ( in_attack ) {
						 alert("please commit or cancel the attack you initiated before continuing");
						 return
					 }
					 phase = phases[phases.indexOf(phase) + 1];
					 $('#status').html('Phase: ' + phase_names[phase]);
					 $('body').trigger(phase.replace(' ', '_'));
					 show_actions(null);
			}).hide(),
			show_for: function(target) {
				return phase != 'procreate'
			}
		},
		{
			name: 'Pacify',
			button: $("<button class='action'>Pacify</button>").appendTo($('#options')).click(function(ev) {
				var target = selected[0].source ?  selected[0].source() : selected;
				var el = target.find('.citizen.'+other_player).first();
				move_and_log(el, $('#graveyard'), 1);
				show_actions(selected);
			}).hide(),
			show_for: function(target) {
				if(!target) return false;
				if(target[0].source) target = target[0].source();
				return phase == 'soldier move' && points >= 1 && (
				  target && target.find('.citizen.'+other_player)[0] && !target.find('.soldier.'+other_player)[0]
				)
			}
		},
		{
			name: 'procreate',
			button: $("<button class='action'>Procreate</button>").appendTo($('#options')).click(function(ev) {
				var target = selected[0].source ?  selected[0].source() : selected;
				target[0].procreated = true;
			  gen_and_log(player+'citizen',target,citizen_cost());
				show_actions(selected);
			}).hide(),
			show_for: function(target) {
				if(!target) return false;
				if(target[0].source) target = target[0].source();
				return phase == 'procreate' &&  points >= citizen_cost() && !target[0].procreated  &&  target.find('.citizen.'+player).size() > 1 && !target.find('.soldier.'+other_player)[0] && target.find('.piece').size() < 5
			}
		},
		{
			name: 'recruit',
			button: $("<button class='action'>Recruit</button>").appendTo($('#options')).click(function(ev) {
				var target = selected[0].source ?  selected[0].source() : selected;
				var el = target.find('.citizen.'+player).first();
				move_and_log(el, $('#graveyard'),0);
			  gen_and_log(player+'soldier',target,2);
				show_actions(selected);
			}).hide(),
			show_for: function(target) {
				if(!target) return false;
				if(target[0].source) target = target[0].source();
				return phase == 'recruit' &&  points > 1 &&  target.find('.citizen.'+player)[0] && !target.find('.soldier.'+other_player)[0]
			}
		},
		{
			name: 'disband',
			button: $("<button class='action'>Disband</button>").appendTo($('#options')).click(function(ev) {
				var target = selected[0].source ?  selected[0].source() : selected;
				var el = target.find('.soldier.'+player).first();
				move_and_log(el, $('#graveyard'), false);
				gen_and_log(''+player+'citizen',target, 0);
			  //generate_piece(player+'citizen',target.attr('sid'));
				if (phase == 'upkeep') {
					points = balance();
				  $('#points').html(points);
				} else if (phase == 'citi move') {
					$('.citizen.'+player).draggable('option','disabled',false);
				}					
				show_actions(selected);
			}).hide(),
			show_for: function(target) {
				if(!target) return false;
				if(target[0].source) target = target[0].source();
				return target.find('.soldier.'+player)[0] 
			}
		},
		{
			name: 'attack',
			button: $("<button class='action'>Attack</button>").appendTo($('#options')).click(function(ev) {
				//console.info('test');
				var target = selected[0].source ?  selected[0].source() : selected;
				//allow to select soldiers....
				// bind to selected... ?
				  soldiers = [];
				  attacked_square = target;
				  $('#board').bind('click.attack', function(){
						if(selected && selected[0].type &&  selected[0].type == 'soldier' && selected[0].player == player && selected[0].source()[0].adj().indexOf(target[0]) > -1) {
						  var soldier = selected[0];
							if(soldiers.indexOf(soldier) >= 0) {
								selected.css({backgroundColor: 'transparent'});
								var i = soldiers.indexOf(soldier);
								var len = soldiers.length;
								soldiers = soldiers.slice(0,i).concat(soldiers.slice(i+1,len));
							} else {
							  soldiers.push(soldier);
								selected.css({backgroundColor: 'red'});
							}
						}
					});
					in_attack = true;
				show_actions(selected);
			}).hide(),
			show_for: function(target) {
				if(!target) return false;
				if(target[0].source) target = target[0].source();
				// and have more neighboring soldiers that you have points to move than enemy soldiers in square... maybe not, maybe just on commit since we need to check there... can't even use same func directly since one needs to get lowest soldier costs... check_attack(sqr, attackers, lowest_cost=[true,false])
				//have an enemy
				return phase == 'soldier move'  && !in_attack && target.find('.soldier.'+other_player)[0]
			}
		},
		{
			name: 'commit attack',
			button: $("<button class='action'>Commit Attack</button>").appendTo($('#options')).click(function(ev) {
				// check enough soldiers are selected and you have enough points to attack with them
				var move_cost = soldiers.reduce(function(s,e) {return s + e.move_cost()},0);
				var enemy_sol_q = attacked_square.find('.soldier.'+other_player).size();
				var enemy_cit_q = attacked_square.find('.citizen.'+other_player).size();
				var my_cit_q = attacked_square.find('.citizen.'+player).size();
				if(soldiers.length < enemy_sol_q || (soldiers.length == enemy_sol_q && !(my_cit_q > enemy_cit_q))) {
					alert("need more soldiers for successfull attack");
					return
				}
				if(move_cost > points) { 
					alert("not enough points to attack with selected soldiers");
					return
				}
				 // unbind selected and
				 $('#board').unbind('click.attack');
				 //move soldiers to square
				var move = '';
				var attack_squares = [];
				 $.each(soldiers, function(i,soldier) {
					 attack_squares.push(soldier.source().attr('sid'));
					 move_and_log($(soldier), attacked_square);
					 $(soldier).css({backgroundColor: 'transparent'});
				 });
				 //console.info(attack_squares);
				 //retreat enemy soldiers ...
				 var retreat_squares = [];
				 var retreat_square = false;
				 //find potential retreat squares
				 $.each(attacked_square[0].adj(), function(i,e) {
					 retreat_square = $(e);
					 if(retreat_square.find('.soldier.'+player).size() == 0 && !(attack_squares.indexOf(retreat_square.attr('sid')) + 1) && (retreat_square.find('.citizen.'+other_player).size() >=  retreat_square.find('.citizen.'+player).size() || retreat_square.find('.soldier.'+other_player)[0]) ) {
						 retreat_squares.push(retreat_square.attr('sid'));
						 //console.info(retreat_squares);
					 }
				 });
				  if(retreat_squares.length == 0) {
					  attacked_square.find('.soldier.' + other_player).each(function(i,e){
							move_and_log($(e), $('#graveyard'), false);
						});
						attack_resolved();
						return true;
					}
				 // get retreat_square
				 serialized_moves = $.map(moves, function(m, i) { return m.for_send(); });
				 
				 $('#block').show();
				 $('#status').html('Attacked, waiting for opponent to retreat');
				 $.post('/push', {c: channel.name, e: 'attack', d:{ moves: serialized_moves, to: retreat_squares }, socket_id: channel.pusher.connection.socket_id });
				 moves = [];
				 // if retreat_square else
				 // block screen.
			}).hide(),
			show_for: function(target) {
				return in_attack
			}
		},
		{
			name: 'Cancel Attack',
			button: $("<button class='action'>Cancel</button>").appendTo($('#options')).click(function(ev) {
				$.each(soldiers, function(i,soldier) {
					 $(soldier).css({backgroundColor: 'transparent'});
				 });
				 soldiers = [];
				 $('#board').unbind('click.attack');
				 in_attack = false;
				 show_actions(false);
			}).hide(),
			show_for: function(target) {
				return in_attack
			}
		},
		{
			name: 'Claim Victory',
			button: $("<button class='action'>Cancel</button>").appendTo($('#options')).click(function(ev) {
				// Claim a victory, if opponent does not respond you get it
				
			}),
			show_for: function(target) {
				return false
			}
		}
	];
	$('body').bind('upkeep', function() {
		if(balance() > 0) {
			$('#next_phase').click();
		}
	});
	$('body').bind('citi_move', function() {
		$('.citizen.'+player).draggable('option','disabled',false);
	});
	$('body').bind('recruit', function() {
		$('.soldier.'+player).draggable('option','disabled',true);
	});
	$('body').bind('soldier_move', function() {
		points = balance();
		$('#points').html(points);
		// can't move citizens
		$('.soldier.'+player).draggable('option','disabled',false);
		// mark costs
		//get distance from closest uncouquered citizen
		$('.square').each(function(i,e) {
			// set action price
			$(e).attr('cost', find_closest_citizen(e));
		});
	});
	$('body').bind('pacify', function() {
		$('.soldier.'+player).draggable('option','disabled',true);
	});	
	$('body').bind('procreate', function() {
		$('.citizen.'+player).draggable('option','disabled',true);
		$('.square').each(function(i,e){ e.procreated = false });
	});
	$('body').bind('upkeep', function() {
		var lost = $('.piece.'+player).size() == 0
		if(lost) {
		  $('#status').html('You have been Conquered.');
			$('.action').hide();
			$('#end_turn').hide();
		}
	});
});

  function kill_extra_pieces(square) {
		// enemy citizens, my citizens, soldiers
		var extra = square.find('.piece').size() - 5;
		$.each(['.citizen.'+other_player, '.citizen.'+player,'.soldier'], function(i, selector){
			square.find(selector).each(function(i, e){
				if(extra > 0) {
					move_and_log($(e), $('#graveyard'), false);
					extra -= 1;
				}
			})
		})
	}
	
	function attack_resolved() {
		kill_extra_pieces(attacked_square);//kill enemy,own citizens and own soldiers until only five pieces are left on the square
		in_attack = false;
		show_actions(false);
		$('#status').html('Phase: ' + phase_names[phase]);
	}

  function find_closest_citizen(square) {
		var depth = 0;
		var found = false;
		while(!found) {
			found = next_depth_for_citizens(square, depth);
			//$('.checked').removeClass('checked');
			depth = depth + 1;
		}
		return depth; //note +1 for movement already added
	}

	function next_depth_for_citizens(square, depth) {
		if(depth == 0) {
		  if(square.has_free_citizen()) {
				return true;
			} 
		}
		//$(square).addClass('checked');
		var res = false;
		if( depth > 0 ) {
		$.each(square.adj(), function(i,e) {
			if(/*!$(e).hasClass('checked') &&*/ !res)  {
				//console.info('testing: ' + $(square).attr('sid'));
				res = next_depth_for_citizens(e,depth -1);
				if(res) return true;
			}
		});
	  }
		return res;
	}
	
	function balance() {
		return $('#board .citizen' + '.' + player).filter(function(i,e){ return !e.source().find('.soldier.'+other_player)[0] }).size() - $('#board  .soldier' + '.' + player).size();
	}
	
	function citizen_cost() {
		var diff = $('#board .piece' + '.' + player).size() - $('#board .piece' + '.' + other_player).size() + 1;
		return diff > 0 ? diff  : 1
	}
	
Piece = clone({}, {
	init: function(elem) { 
		this.elem = elem;  //backwards compatibility == $(this)
		this.piece = elem[0]; //backwards compatibility == this
		this.player = this.elem.hasClass('1') ? '1' : '2';
		this.other_player = this.player == '1' ? '2' : '1';
		return this;
	},
	source: function() {
		return this.elem.parents('.ui-droppable').first();
	},
	is_opponent_piece:  function(pieces) {
		return pieces.is('.' + this.other_player)
	},
	move_cost: function() { return 1 }
});


Citizen = clone(Piece, {
	type: 'citizen',
	mark_moves : function() {
		if(points == 0) return;
		$(this.source()[0].adj()).filter(function(i,e) { return !$(e).find('.soldier.'+other_player)[0] && $(e).find('.piece').size() != 5 }).addClass('movable');
	},
	after_move : function () {}
});
Soldier = clone(Piece, {
	type: 'soldier',
	move_cost: function() { return (+(this.source().attr('cost'))) },
	mark_moves : function() {
		if(points >= this.move_cost()) {
			$('#status').html('Cost: '+ this.move_cost());
			$(this.source()[0].adj()).filter(function(i,e) { return !$(e).find('.soldier.'+other_player)[0] && $(e).find('.soldier').size() != 5 }).addClass('movable');
		}
	},
	after_move : function () {
		kill_extra_pieces(this.source());
	}
});

pieces = {
	citizen: Citizen,
	soldier: Soldier
};

squares = {
	a : {
		lines: ['b','e']
	},
	b : {
		lines: ['c','d','a']
	},
	c : {
		lines: ['b','h']
	},
	d : {
		lines: ['b','e','h','g']
	},
	e : {
		lines: ['a','d','f']
	},
	f : {
		lines: ['g','e','k']
	},
	g : {
		lines: ['d','n','f','k']
	},
	h : {
		lines: ['c','d','n','i']
	},
	i : {
		lines: ['h','n','j']
	},
	j : {
		lines: ['m','i','n','l']
	},
	k : {
		lines: ['f','g','n','l']
	},
	l : {
		lines: ['k','j']
	},
	m : {
		lines: ['j']
	},
	n : {
		lines: ['i','h','g','k','j']
	}
}